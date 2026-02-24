// src/shared/components/SafeLink.tsx
import React, { useMemo } from "react";
import { toSafeHttpUrl, safeRel } from "../utils/safeLink";

type SafeLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  /** 不安全时展示的文本（可选） */
  fallbackText?: string;
};

export function SafeLink(props: SafeLinkProps) {
  const {
    href,
    target = "_blank",
    rel,
    children,
    fallbackText = "链接不可用",
    ...rest
  } = props;

  const safeHref = useMemo(() => toSafeHttpUrl(href ?? ""), [href]);

  // 不安全：直接不渲染为可点击链接（避免用户点到奇怪 scheme）
  if (!safeHref) {
    return <span {...(rest as any)}>{children ?? fallbackText}</span>;
  }

  return (
    <a {...rest} href={safeHref} target={target} rel={safeRel(rel)}>
      {children}
    </a>
  );
}
