export type ContainerSpecValue = "20ft" | "40ft" | "45ft";

export type ContainerSpec = {
  value: ContainerSpecValue;
  label: string;
  sublabel: string;
  disabled?: boolean;
};

export const CONTAINER_SPECS: ContainerSpec[] = [
  { value: "20ft", label: "20ft Dry", sublabel: "TEU" },
  { value: "40ft", label: "40ft Dry", sublabel: "FEU" },
  { value: "45ft", label: "45ft High Cube", sublabel: "HC", disabled: true },
];
