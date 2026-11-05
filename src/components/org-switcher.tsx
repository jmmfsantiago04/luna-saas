"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Org = { id: string; name: string; slug: string; role: string };

export function OrgSwitcher({ orgs, currentSlug }: { orgs: Org[]; currentSlug: string }) {
  const current = orgs.find((o) => o.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-md px-2 py-1 font-semibold hover:bg-muted">
        {current?.name ?? "Organização"} ▾
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Suas organizações</DropdownMenuLabel>
        {orgs.map((o) => (
          <DropdownMenuItem key={o.id} render={<Link href={`/app/${o.slug}`} />}>
            {o.name}
            <span className="ml-auto text-xs text-muted-foreground">{o.role}</span>
          </DropdownMenuItem>
        ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/onboarding?new=1" />}>+ Nova organização</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}