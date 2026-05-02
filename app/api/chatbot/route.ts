import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSystemUser } from "@/lib/auth";
import { createRecord, listRecords } from "@/lib/core/crud";
import { isLocale, type Locale } from "@/lib/i18n";

type ChatPayload = {
  businessId?: string;
  message?: string;
  locale?: string;
  lead?: {
    name?: string;
    phone?: string;
    email?: string;
    serviceInterest?: string;
  };
  createRecords?: boolean;
};

const copy = {
  es: {
    invalidBody: "Body inválido.",
    defaultReply: "Puedo responder FAQs, capturar datos de contacto y crear una cita para el módulo configurado.",
    missingBeforeCreate: (missing: string[]) => `Necesito ${missing.join(", ")} antes de crear el contacto y la cita.`,
    newContact: "Nuevo contacto",
    createdByChatbot: "Creado por el chatbot de ZQX Platform.",
    intakeNote: "Creado desde intake automatizado.",
    location: "Recepción",
    createdReply: (name: string, service: string) => `Creé a ${name} y agendé una cita pendiente para ${service}.`,
    fieldNames: {
      name: "nombre",
      phone: "teléfono",
      email: "email",
      serviceInterest: "servicio de interés",
    },
  },
  en: {
    invalidBody: "Invalid body.",
    defaultReply: "I can answer FAQs, capture contact details, and create an appointment for the configured module.",
    missingBeforeCreate: (missing: string[]) => `I need ${missing.join(", ")} before creating the contact and appointment.`,
    newContact: "New contact",
    createdByChatbot: "Created by the ZQX Platform chatbot.",
    intakeNote: "Created from automated intake.",
    location: "Front desk",
    createdReply: (name: string, service: string) => `Created ${name} and scheduled a pending appointment for ${service}.`,
    fieldNames: {
      name: "name",
      phone: "phone",
      email: "email",
      serviceInterest: "service interest",
    },
  },
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function emailIsValid(value?: string) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentSystemUser();

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: ChatPayload;

  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ error: copy.es.invalidBody }, { status: 400 });
  }

  const locale: Locale = isLocale(body.locale) ? body.locale : "es";
  const t = copy[locale];
  const businessId = body.businessId ?? user.businessId;
  const message = body.message?.trim() ?? "";
  const lead = body.lead ?? {};
  const faqs = listRecords("faqs", { business_id: businessId });
  const services = listRecords("services", { business_id: businessId });
  const matchedFaq = faqs.find((faq) => {
    const text = normalize(`${faq.question} ${faq.tags.join(" ")}`);
    return normalize(message)
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .some((word) => text.includes(word));
  });

  let reply = matchedFaq?.answer ?? t.defaultReply;
  let createdClient;
  let createdAppointment;

  if (body.createRecords) {
    const missingKeys = [
      !lead.name?.trim() ? "name" : "",
      !lead.phone?.trim() ? "phone" : "",
      !emailIsValid(lead.email) ? "email" : "",
      !lead.serviceInterest?.trim() ? "serviceInterest" : "",
    ].filter(Boolean) as Array<keyof typeof t.fieldNames>;

    if (missingKeys.length > 0) {
      reply = t.missingBeforeCreate(missingKeys.map((key) => t.fieldNames[key]));
    } else {
      const service = services.find((item) => normalize(item.name) === normalize(lead.serviceInterest ?? "")) ?? services[0];
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 2);
      scheduledAt.setHours(15, 0, 0, 0);

      createdClient = createRecord("clients", {
        business_id: businessId,
        name: lead.name ?? t.newContact,
        type: "person",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        status: "lead",
        service_interest: lead.serviceInterest ?? service.name,
        notes: t.createdByChatbot,
      });

      createdAppointment = createRecord("appointments", {
        business_id: businessId,
        client_id: createdClient.id,
        service_id: service.id,
        title: service.name,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
        location: t.location,
        notes: t.intakeNote,
      });

      reply = t.createdReply(createdClient.name, service.name);
    }
  }

  createRecord("chatbot_logs", {
    business_id: businessId,
    user_email: user.email,
    visitor_name: lead.name,
    visitor_phone: lead.phone,
    visitor_email: lead.email,
    service_interest: lead.serviceInterest,
    message,
    response: reply,
    created_client_id: createdClient?.id,
    created_appointment_id: createdAppointment?.id,
  });

  return NextResponse.json({ reply, createdClient, createdAppointment });
}
