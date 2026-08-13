import type { FC, SVGProps } from "react";

export type Station = {
  code: string;
  name: string;
  country: string;
  Flag: FC<SVGProps<SVGSVGElement>>;
};
