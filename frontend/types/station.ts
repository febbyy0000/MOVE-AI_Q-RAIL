import type { FC, SVGProps } from "react";

export type Station = {
  code: string;
  name: string;
  country: string;
  Flag: FC<SVGProps<SVGSVGElement>>;
  /** 백엔드 해외 운임 계산 API가 기대하는 영문 목적지 키 (예: "almaty") */
  apiKey?: string;
};
