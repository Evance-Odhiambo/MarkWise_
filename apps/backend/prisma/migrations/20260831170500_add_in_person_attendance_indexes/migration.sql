-- Composite indexes for the duplicate-mark and device-conflict checks that
-- run on every in-person attendance verification path (QR, BLE, PIN, relay).
CREATE INDEX "InPersonAttendanceRecord_studentId_conductedSessionId_idx" ON "InPersonAttendanceRecord"("studentId", "conductedSessionId");

CREATE INDEX "InPersonAttendanceRecord_conductedSessionId_deviceId_idx" ON "InPersonAttendanceRecord"("conductedSessionId", "deviceId");
