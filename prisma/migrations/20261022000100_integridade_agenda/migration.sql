-- Regras de integridade que o Prisma não expressa no schema.

-- 1) PREVENÇÃO DE DOUBLE-BOOKING NO BANCO (a última linha de defesa).
--    Dois agendamentos ativos do mesmo profissional não podem ter intervalos
--    que se sobreponham, mesmo com requisições simultâneas.
--    '[)' = início inclusivo, fim exclusivo: um atendimento que termina às 16:00
--    e outro que começa às 16:00 NÃO conflitam.
--    Cancelado e Falta liberam o horário (ficam fora do WHERE).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED'));

-- 2) Coerência de intervalos
ALTER TABLE "Appointment" ADD CONSTRAINT appointment_intervalo_valido CHECK ("endsAt" > "startsAt");
ALTER TABLE "TimeBlock"   ADD CONSTRAINT timeblock_intervalo_valido   CHECK ("endsAt" > "startsAt");

ALTER TABLE "WorkSchedule" ADD CONSTRAINT workschedule_dia_valido CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "WorkSchedule" ADD CONSTRAINT workschedule_horas_validas CHECK (
  "startMin" >= 0 AND "endMin" <= 1440 AND "startMin" < "endMin"
  AND (
    ("breakStartMin" IS NULL AND "breakEndMin" IS NULL)
    OR ("breakStartMin" IS NOT NULL AND "breakEndMin" IS NOT NULL AND "breakStartMin" < "breakEndMin")
  )
);

ALTER TABLE "Service" ADD CONSTRAINT service_valores_validos CHECK (
  "priceCents" >= 0 AND "durationMin" > 0 AND "bufferMin" >= 0
);

-- 3) Expediente do salão (professionalId NULL): no Postgres NULL não conflita
--    em índice único, então garantimos 1 linha por dia da semana com índice parcial.
CREATE UNIQUE INDEX "WorkSchedule_salao_weekday_key"
  ON "WorkSchedule" ("weekday") WHERE "professionalId" IS NULL;

-- 4) Linha única de configurações
ALTER TABLE "Settings" ADD CONSTRAINT settings_linha_unica CHECK ("id" = 1);
