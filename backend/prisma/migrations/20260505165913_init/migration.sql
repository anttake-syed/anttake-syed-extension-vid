-- CreateTable
CREATE TABLE "Capture" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "size" TEXT,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);
