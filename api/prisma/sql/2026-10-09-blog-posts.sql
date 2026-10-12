-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cardTitle" TEXT,
    "excerpt" TEXT NOT NULL,
    "category" TEXT,
    "author" TEXT,
    "coverImage" TEXT,
    "coverAlt" TEXT,
    "coverPosition" TEXT,
    "photoCredit" TEXT,
    "photoCreditUrl" TEXT,
    "introduction" TEXT[],
    "sections" JSONB NOT NULL DEFAULT '[]',
    "takeaway" TEXT,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");

