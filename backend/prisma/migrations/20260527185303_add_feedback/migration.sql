-- CreateTable
CREATE TABLE "Capture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "size" TEXT,
    "mimeType" TEXT,
    "data" BLOB,
    "fileUrl" TEXT NOT NULL,
    "driveUrl" TEXT,
    "storageLocation" TEXT NOT NULL DEFAULT 'local',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "storagePreference" TEXT NOT NULL DEFAULT 'both',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_email_key" ON "UserSettings"("email");
