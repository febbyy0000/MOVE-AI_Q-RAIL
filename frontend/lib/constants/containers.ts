export type ContainerSpecValue = "40ft";

export type ContainerSpec = {
  value: ContainerSpecValue;
  label: string;
  sublabel: string;
  disabled?: boolean;
};

export const CONTAINER_SPECS: ContainerSpec[] = [
  { value: "40ft", label: "40ft Dry", sublabel: "FEU" },
];
