-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('student', 'lecturer', 'administrator');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SYSTEM_ADMIN', 'INSTITUTION_ADMIN');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequest" (
    "id" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseYear" (
    "id" TEXT NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "courseYearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bleId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "semesterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "email" TEXT,
    "year" INTEGER NOT NULL,
    "push_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAuth" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "role" "UserType" NOT NULL DEFAULT 'student',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCredential" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "studentId" TEXT,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceName" TEXT,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fingerprintHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecturer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "staffNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT NOT NULL,
    "fcm_token" TEXT,

    CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerAuth" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturerAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerUnit" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,

    CONSTRAINT "LecturerUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BleMapping" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "unitCode" TEXT,
    "unitBleId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BleMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BLESyncLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "unitsSynced" INTEGER,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT,
    "deviceInfo" JSONB,

    CONSTRAINT "BLESyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductedSession" (
    "id" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL,
    "sessionEnd" TIMESTAMP(3),
    "lecturerId" TEXT NOT NULL,
    "sessionKey" TEXT,
    "sessionNonce" BIGINT NOT NULL DEFAULT 0,
    "sessionDuration" INTEGER NOT NULL DEFAULT 3600,
    "bleUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConductedSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InPersonAttendanceRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "sessionStart" TIMESTAMP(3) NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT,
    "rawPayload" TEXT,
    "method" TEXT NOT NULL,
    "delegationId" TEXT,
    "admissionNumber" TEXT,
    "markedByLecturerId" TEXT,
    "institutionId" TEXT,
    "conductedSessionId" TEXT,
    "token" TEXT,
    "counter" INTEGER,
    "pinCounter" INTEGER,
    "submittedNonce" BIGINT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InPersonAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineAttendanceSession" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'online',
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineAttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineAttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL DEFAULT '',
    "deviceId" TEXT,
    "ip_address" TEXT,
    "fingerprint_hash" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "sessionRef" TEXT NOT NULL,
    "institutionId" TEXT,
    "unitCode" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "leaderStudentId" TEXT,
    "validFrom" BIGINT NOT NULL,
    "validUntil" BIGINT NOT NULL,
    "sessionToken" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "type" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingInvite" (
    "id" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "lecturerName" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "meetingLink" TEXT NOT NULL,
    "passcode" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollmentSnapshot" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "unitCodes" TEXT[],
    "unitNamesMap" JSONB NOT NULL DEFAULT '{}',
    "year" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlocklist" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlocklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DelegationToInPersonAttendanceRecord" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DelegationToInPersonAttendanceRecord_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_institutionId_idx" ON "Admin"("institutionId");

-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE INDEX "OnboardingRequest_status_idx" ON "OnboardingRequest"("status");

-- CreateIndex
CREATE INDEX "OnboardingRequest_email_idx" ON "OnboardingRequest"("email");

-- CreateIndex
CREATE INDEX "Course_institutionId_idx" ON "Course"("institutionId");

-- CreateIndex
CREATE INDEX "CourseYear_courseId_idx" ON "CourseYear"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseYear_courseId_yearNumber_key" ON "CourseYear"("courseId", "yearNumber");

-- CreateIndex
CREATE INDEX "Semester_courseYearId_idx" ON "Semester"("courseYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_courseYearId_semesterNumber_key" ON "Semester"("courseYearId", "semesterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_bleId_key" ON "Unit"("bleId");

-- CreateIndex
CREATE INDEX "Unit_semesterId_idx" ON "Unit"("semesterId");

-- CreateIndex
CREATE INDEX "Unit_code_idx" ON "Unit"("code");

-- CreateIndex
CREATE INDEX "Unit_bleId_idx" ON "Unit"("bleId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_institutionId_idx" ON "Student"("institutionId");

-- CreateIndex
CREATE INDEX "Student_courseId_idx" ON "Student"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_institutionId_admissionNumber_key" ON "Student"("institutionId", "admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAuth_studentId_key" ON "StudentAuth"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAuth_email_key" ON "StudentAuth"("email");

-- CreateIndex
CREATE INDEX "Enrollment_unitId_idx" ON "Enrollment"("unitId");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_unitId_key" ON "Enrollment"("studentId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDevice_deviceKey_key" ON "StudentDevice"("deviceKey");

-- CreateIndex
CREATE INDEX "StudentDevice_userId_idx" ON "StudentDevice"("userId");

-- CreateIndex
CREATE INDEX "StudentDevice_deviceKey_idx" ON "StudentDevice"("deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDevice_userId_deviceKey_key" ON "StudentDevice"("userId", "deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCredential_credentialId_key" ON "DeviceCredential"("credentialId");

-- CreateIndex
CREATE INDEX "DeviceCredential_userId_idx" ON "DeviceCredential"("userId");

-- CreateIndex
CREATE INDEX "DeviceCredential_credentialId_idx" ON "DeviceCredential"("credentialId");

-- CreateIndex
CREATE INDEX "DeviceCredential_studentId_idx" ON "DeviceCredential"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCredential_userId_credentialId_key" ON "DeviceCredential"("userId", "credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCredential_studentId_key" ON "DeviceCredential"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_staffNumber_key" ON "Lecturer"("staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_email_key" ON "Lecturer"("email");

-- CreateIndex
CREATE INDEX "Lecturer_institutionId_idx" ON "Lecturer"("institutionId");

-- CreateIndex
CREATE INDEX "Lecturer_staffNumber_idx" ON "Lecturer"("staffNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LecturerAuth_lecturerId_key" ON "LecturerAuth"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "LecturerAuth_email_key" ON "LecturerAuth"("email");

-- CreateIndex
CREATE INDEX "LecturerUnit_unitId_idx" ON "LecturerUnit"("unitId");

-- CreateIndex
CREATE INDEX "LecturerUnit_lecturerId_idx" ON "LecturerUnit"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "LecturerUnit_lecturerId_unitId_key" ON "LecturerUnit"("lecturerId", "unitId");

-- CreateIndex
CREATE INDEX "BleMapping_institutionId_idx" ON "BleMapping"("institutionId");

-- CreateIndex
CREATE INDEX "BleMapping_unitCode_idx" ON "BleMapping"("unitCode");

-- CreateIndex
CREATE INDEX "BLESyncLog_institutionId_idx" ON "BLESyncLog"("institutionId");

-- CreateIndex
CREATE INDEX "BLESyncLog_startedAt_idx" ON "BLESyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "ConductedSession_unitCode_idx" ON "ConductedSession"("unitCode");

-- CreateIndex
CREATE INDEX "ConductedSession_lecturerId_idx" ON "ConductedSession"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "ConductedSession_unitCode_sessionStart_key" ON "ConductedSession"("unitCode", "sessionStart");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_studentId_idx" ON "InPersonAttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_unitCode_idx" ON "InPersonAttendanceRecord"("unitCode");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_institutionId_idx" ON "InPersonAttendanceRecord"("institutionId");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_delegationId_idx" ON "InPersonAttendanceRecord"("delegationId");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_markedByLecturerId_idx" ON "InPersonAttendanceRecord"("markedByLecturerId");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_unitCode_sessionStart_idx" ON "InPersonAttendanceRecord"("unitCode", "sessionStart");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_studentId_unitCode_idx" ON "InPersonAttendanceRecord"("studentId", "unitCode");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_conductedSessionId_idx" ON "InPersonAttendanceRecord"("conductedSessionId");

-- CreateIndex
CREATE INDEX "InPersonAttendanceRecord_deviceId_unitCode_sessionStart_idx" ON "InPersonAttendanceRecord"("deviceId", "unitCode", "sessionStart");

-- CreateIndex
CREATE UNIQUE INDEX "InPersonAttendanceRecord_studentId_unitCode_sessionStart_key" ON "InPersonAttendanceRecord"("studentId", "unitCode", "sessionStart");

-- CreateIndex
CREATE INDEX "OnlineAttendanceSession_lecturerId_idx" ON "OnlineAttendanceSession"("lecturerId");

-- CreateIndex
CREATE INDEX "OnlineAttendanceSession_status_idx" ON "OnlineAttendanceSession"("status");

-- CreateIndex
CREATE INDEX "OnlineAttendanceSession_status_expiresAt_idx" ON "OnlineAttendanceSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "OnlineAttendanceRecord_sessionId_idx" ON "OnlineAttendanceRecord"("sessionId");

-- CreateIndex
CREATE INDEX "OnlineAttendanceRecord_studentId_idx" ON "OnlineAttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "OnlineAttendanceRecord_unitCode_idx" ON "OnlineAttendanceRecord"("unitCode");

-- CreateIndex
CREATE INDEX "OnlineAttendanceRecord_unitCode_markedAt_idx" ON "OnlineAttendanceRecord"("unitCode", "markedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineAttendanceRecord_sessionId_studentId_key" ON "OnlineAttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineAttendanceRecord_sessionId_deviceId_key" ON "OnlineAttendanceRecord"("sessionId", "deviceId");

-- CreateIndex
CREATE INDEX "Delegation_leaderStudentId_idx" ON "Delegation"("leaderStudentId");

-- CreateIndex
CREATE INDEX "Delegation_sessionRef_idx" ON "Delegation"("sessionRef");

-- CreateIndex
CREATE INDEX "Delegation_unitCode_idx" ON "Delegation"("unitCode");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "MeetingInvite_unitCode_scheduledAt_idx" ON "MeetingInvite"("unitCode", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollmentSnapshot_studentId_key" ON "StudentEnrollmentSnapshot"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlocklist_jti_key" ON "TokenBlocklist"("jti");

-- CreateIndex
CREATE INDEX "TokenBlocklist_expiresAt_idx" ON "TokenBlocklist"("expiresAt");

-- CreateIndex
CREATE INDEX "_DelegationToInPersonAttendanceRecord_B_index" ON "_DelegationToInPersonAttendanceRecord"("B");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseYear" ADD CONSTRAINT "CourseYear_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_courseYearId_fkey" FOREIGN KEY ("courseYearId") REFERENCES "CourseYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAuth" ADD CONSTRAINT "StudentAuth_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerAuth" ADD CONSTRAINT "LecturerAuth_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnit" ADD CONSTRAINT "LecturerUnit_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnit" ADD CONSTRAINT "LecturerUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InPersonAttendanceRecord" ADD CONSTRAINT "InPersonAttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InPersonAttendanceRecord" ADD CONSTRAINT "InPersonAttendanceRecord_conductedSessionId_fkey" FOREIGN KEY ("conductedSessionId") REFERENCES "ConductedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineAttendanceRecord" ADD CONSTRAINT "OnlineAttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnlineAttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DelegationToInPersonAttendanceRecord" ADD CONSTRAINT "_DelegationToInPersonAttendanceRecord_A_fkey" FOREIGN KEY ("A") REFERENCES "Delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DelegationToInPersonAttendanceRecord" ADD CONSTRAINT "_DelegationToInPersonAttendanceRecord_B_fkey" FOREIGN KEY ("B") REFERENCES "InPersonAttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
