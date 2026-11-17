"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useRememberedListHref } from "@/components/erp/data-table/list-memory";

type ListReturnLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { listPath: string };

/** Link back to a list that restores the list's last filters, sort and page. */
export function ListReturnLink({ listPath, ...props }: ListReturnLinkProps) {
  const href = useRememberedListHref(listPath);
  return <Link href={href} {...props} />;
}
