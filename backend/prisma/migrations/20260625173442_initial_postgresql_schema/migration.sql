-- CreateTable
CREATE TABLE "Capture" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "size" TEXT,
    "mimeType" TEXT,
    "fileUrl" TEXT NOT NULL,
    "driveUrl" TEXT,
    "storageLocation" TEXT NOT NULL DEFAULT 'drive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "storagePreference" TEXT NOT NULL DEFAULT 'both',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_email_key" ON "UserSettings"("email");
