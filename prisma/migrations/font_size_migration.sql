CREATE TYPE "FontSizePreference" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

ALTER TABLE "users"
  ADD COLUMN "font_size_preference" "FontSizePreference" NOT NULL DEFAULT 'MEDIUM';
