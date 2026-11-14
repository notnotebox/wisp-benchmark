import type { ComponentProps } from "react";

import { FaTwitter } from "react-icons/fa";

export function TwitterIcon(props: ComponentProps<typeof FaTwitter>) {
  return <FaTwitter aria-hidden="true" focusable="false" {...props} />;
}
