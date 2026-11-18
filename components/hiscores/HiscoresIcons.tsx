import type { ComponentProps } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export type HiscoreTab = "skills" | "records" | "collection" | "votes" | string;

export interface HiscoresIconsProps extends ComponentProps<"span"> {
  tab?: HiscoreTab;
}

const TAB_ICONS: Record<string, string> = {
  skills: "/hiscores/hiscores_icon.png",
  records: "/records/records_icon.png",
  collection: "/collectionlog/Collection_log.webp",
  votes: "/vote/vote_icon.png",
};

export function HiscoresIcons({
  tab = "skills",
  className,
  ...props
}: HiscoresIconsProps) {
  const src = TAB_ICONS[tab] ?? "/hiscores/hiscores_icon.png";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 w-5 h-5",
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        className="object-contain [image-rendering:pixelated]"
        sizes="1.25rem"
      />
    </span>
  );
}

export function HiscoresIcon(props: ComponentProps<"span">) {
  return <HiscoresIcons tab="skills" {...props} />;
}

export function RecordsIcon(props: ComponentProps<"span">) {
  return <HiscoresIcons tab="records" {...props} />;
}

export function CollectionLogIcon(props: ComponentProps<"span">) {
  return <HiscoresIcons tab="collection" {...props} />;
}
