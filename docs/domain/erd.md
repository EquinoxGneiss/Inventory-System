# Basic ERD (proposed)

**Status: Proposed** (Phase 0 exit gate). The source is `implementation.md` §5.1. Column lists show the key fields only. Every tenant-scoped table also carries `organization_id`, `created_at` and `updated_at`.

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ BUILDINGS : has
    ORGANIZATIONS ||--o{ WAREHOUSES : has
    ORGANIZATIONS ||--o{ MEMBERSHIPS : grants
    ORGANIZATIONS ||--o{ PRODUCTS : owns
    ORGANIZATIONS ||--o{ PRODUCT_CATEGORIES : owns
    ORGANIZATIONS ||--o{ INVENTORY_REQUESTS : scopes
    BUILDINGS ||--o{ MEMBERSHIPS : "scopes (nullable)"
    BUILDINGS ||--o{ STOCK_LOCATIONS : "has (optional)"
    BUILDINGS ||--o{ INVENTORY_REQUESTS : requests
    WAREHOUSES ||--o{ STOCK_LOCATIONS : contains
    STOCK_LOCATIONS ||--o{ STOCK_LOCATIONS : parent_of
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : classifies
    UNITS_OF_MEASURE ||--o{ PRODUCTS : base_unit
    PRODUCTS ||--o{ STOCK_BALANCES : counted_in
    STOCK_LOCATIONS ||--o{ STOCK_BALANCES : holds
    INVENTORY_REQUESTS ||--|{ INVENTORY_REQUEST_LINES : contains
    INVENTORY_REQUESTS ||--o{ REQUEST_APPROVALS : records
    INVENTORY_REQUEST_LINES ||--o{ STOCK_RESERVATIONS : reserves
    STOCK_OPERATIONS ||--|{ STOCK_OPERATION_LINES : contains
    STOCK_OPERATION_LINES ||--o{ STOCK_LEDGER_ENTRIES : posts
    STOCK_OPERATIONS ||--o{ RECEIPT_CONFIRMATIONS : confirmed_by
    INVENTORY_REQUESTS ||--o{ STOCK_OPERATIONS : fulfilled_by

    ORGANIZATIONS {
        uuid id PK
        text code UK
        text name
        bool is_active
    }
    BUILDINGS {
        uuid id PK
        uuid organization_id FK
        text code
        text name
    }
    MEMBERSHIPS {
        uuid id PK
        uuid user_id FK "auth.users"
        uuid organization_id FK
        uuid building_id FK "nullable"
        text role "enum"
        bool is_active
    }
    WAREHOUSES {
        uuid id PK
        uuid organization_id FK
        text code
        text name
    }
    STOCK_LOCATIONS {
        uuid id PK
        uuid organization_id FK
        uuid warehouse_id FK "nullable"
        uuid building_id FK "nullable"
        uuid parent_id FK "nullable"
        text type "internal|transit|supplier|adjustment|building"
    }
    UNITS_OF_MEASURE {
        uuid id PK
        text code UK
        text name
        int precision
    }
    PRODUCTS {
        uuid id PK
        uuid organization_id FK
        text sku "unique per org"
        text name
        uuid category_id FK
        uuid base_uom_id FK
        numeric min_quantity
        bool is_active
    }
    STOCK_BALANCES {
        uuid organization_id FK
        uuid location_id FK
        uuid product_id FK
        numeric on_hand
    }
    STOCK_RESERVATIONS {
        uuid id PK
        uuid request_line_id FK
        uuid product_id FK
        uuid location_id FK
        numeric quantity
        text status "active|consumed|released"
    }
    INVENTORY_REQUESTS {
        uuid id PK
        uuid organization_id FK
        uuid building_id FK
        uuid requester_id FK
        text reference UK "REQ-YYYY-NNNNNN"
        text status
        int version
        date required_date
    }
    INVENTORY_REQUEST_LINES {
        uuid id PK
        uuid request_id FK
        uuid product_id FK
        numeric requested
        numeric approved
    }
    REQUEST_APPROVALS {
        uuid id PK
        uuid request_id FK
        uuid approver_id FK
        text action "approve|reject|request_changes"
        text notes
        timestamptz decided_at
    }
    STOCK_OPERATIONS {
        uuid id PK
        uuid organization_id FK
        text operation_type "receipt|release|transfer|adjustment|reversal"
        text status
        text reference UK
        text idempotency_key "unique per org+command"
    }
    STOCK_OPERATION_LINES {
        uuid id PK
        uuid operation_id FK
        uuid product_id FK
        uuid source_location_id FK
        uuid destination_location_id FK
        numeric quantity
    }
    STOCK_LEDGER_ENTRIES {
        uuid id PK
        uuid operation_line_id FK
        uuid product_id FK
        uuid location_id FK
        numeric quantity "signed"
        timestamptz posted_at
    }
    RECEIPT_CONFIRMATIONS {
        uuid id PK
        uuid operation_id FK
        uuid receiver_id FK
        timestamptz received_at
        text discrepancy_reason
    }
```

Also part of the model, but not drawn above: `user_profiles`, `attachments`, `audit_events` (append-only), `notifications`, and an organization-scoped `document_sequences` table for `REQ-`, `REL-` and `RCV-` numbering.
