import type { BusinessIndustry, ModuleBlueprint, ModuleKey } from "@/lib/core/types";

export const moduleBlueprints: Record<ModuleKey, ModuleBlueprint> = {
  general: {
    key: "general",
    label: "Módulo general",
    entitySingular: "Cliente",
    entityLabel: "Clientes",
    appointmentSingular: "Cita",
    appointmentLabel: "Citas",
    serviceExamples: ["Consulta inicial", "Revisión de seguimiento", "Presentación comercial"],
  },
  dentist: {
    key: "dentist",
    label: "Módulo dental",
    entitySingular: "Paciente",
    entityLabel: "Pacientes",
    appointmentSingular: "Cita dental",
    appointmentLabel: "Citas dentales",
    serviceExamples: ["Limpieza dental", "Evaluación de ortodoncia", "Seguimiento de tratamiento"],
  },
  medical: {
    key: "medical",
    label: "Módulo médico",
    entitySingular: "Paciente",
    entityLabel: "Pacientes",
    appointmentSingular: "Cita médica",
    appointmentLabel: "Citas médicas",
    serviceExamples: ["Consulta inicial", "Revisión de laboratorio", "Referencia a especialista"],
  },
  university: {
    key: "university",
    label: "Módulo universitario",
    entitySingular: "Estudiante",
    entityLabel: "Estudiantes",
    appointmentSingular: "Sesión",
    appointmentLabel: "Sesiones académicas",
    serviceExamples: ["Entrevista de admisión", "Revisión de becas", "Asesoría académica"],
  },
  consulting: {
    key: "consulting",
    label: "Módulo consultoría",
    entitySingular: "Cuenta",
    entityLabel: "Cuentas",
    appointmentSingular: "Reunión",
    appointmentLabel: "Reuniones con clientes",
    serviceExamples: ["Discovery", "Revisión de propuesta", "Checkpoint de entrega"],
  },
  restaurant: {
    key: "restaurant",
    label: "Módulo comida",
    entitySingular: "Cliente",
    entityLabel: "Clientes",
    appointmentSingular: "Reserva",
    appointmentLabel: "Reservas y pedidos",
    serviceExamples: ["Reserva de mesa", "Pedido corporativo", "Evento privado"],
  },
  custom: {
    key: "custom",
    label: "Módulo personalizado",
    entitySingular: "Registro",
    entityLabel: "Registros",
    appointmentSingular: "Actividad",
    appointmentLabel: "Trabajo programado",
    serviceExamples: ["Intake configurable", "Revisión de flujo", "Seguimiento de cuenta"],
  },
};

export function getPrimaryModuleForIndustry(industry: BusinessIndustry) {
  return moduleBlueprints[industry] ?? moduleBlueprints.general;
}
