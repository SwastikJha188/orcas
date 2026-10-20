/** Process stages of a machine (/api/process). Values and status come from the linked measurements. */

export interface ProcessIOItem {
  name: string;
  category: "Material" | "Water" | "Energy" | "Media" | "Slurry" | "Gas" | "Product" | "Reject" | "Utility";
  /** Design specification of the stream, from the process documents. */
  rateOrSpec: string;
  sourceOrDestination: string;
  status: "Normal" | "Alert" | "Critical";
}

export interface ProcessParameter {
  label: string;
  value: string;
  unit?: string;
  status?: "Normal" | "Alert" | "Critical";
}

export interface MachineProcessStage {
  id: string;
  stepNumber: string;
  name: string;
  role: string;
  subtitle: string;
  /** No stage-level health model exists; null. */
  health: number | null;
  status: "Normal" | "Alert" | "Critical";
  healthNotes: string;
  transformation: string;
  associatedParts: string[];
  parameters: ProcessParameter[];
  inputs: ProcessIOItem[];
  outputs: ProcessIOItem[];
}
