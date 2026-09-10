-- CreateTable
CREATE TABLE "alert_dismissals" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "episode_start" TIMESTAMP(3) NOT NULL,
    "dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_dismissals_course_id_episode_start_idx" ON "alert_dismissals"("course_id", "episode_start");

-- CreateIndex
CREATE INDEX "alert_dismissals_learner_id_episode_start_idx" ON "alert_dismissals"("learner_id", "episode_start");

-- CreateIndex
CREATE UNIQUE INDEX "alert_dismissals_learner_id_course_id_episode_start_key" ON "alert_dismissals"("learner_id", "course_id", "episode_start");

-- AddForeignKey
ALTER TABLE "alert_dismissals" ADD CONSTRAINT "alert_dismissals_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_dismissals" ADD CONSTRAINT "alert_dismissals_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
