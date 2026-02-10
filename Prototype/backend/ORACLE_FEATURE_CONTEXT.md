# Market Oracle Feature - Backend Context & Action Plan

## **1. Feature Overview**

The **Market Oracle** is a unified simulation environment that allows users to experience 30-day market scenarios.
It uses a **Tri-Agent Pipeline** (Architect, Chronicler, Executor) powered by Gemini 1.5 Flash to generate realistic market trajectories and narratives.

**Key Backend Responsibilities:**

1.  **Generation**: Use Gemini to generate price trajectories and news headlines.
2.  **Persistence**: Cache generated scenarios in PostgreSQL to save costs and allow reuse.
3.  **Orchestration**: Serve simulation data to the frontend.

---

## **2. System Architecture**

### **A. Database Schema (Prisma)**

New model `SimulationScenario` to store the generated states.

```prisma
enum PresetType {
  STEADY_CLIMB
  FLASH_CRASH
  IMF_ROLLERCOASTER
  REALISTIC_OUTLOOK // Pro mode
}

model SimulationScenario {
  id            String      @id @default(uuid())
  presetType    PresetType
  stockSymbol   String
  createdAt     DateTime    @default(now())
  expiresAt     DateTime?   // For Pro mode (24h expiry)

  // Stored as JSON to avoid massive row counts for high-freq ticks
  trajectoryJson Json       // Array of 30 percentage modifiers
  newsJson       Json       // Array of headlines with day indices

  // Metadata
  basePrice     Float
}
```

### **B. The Tri-Agent Services**

We need a `GeminiOracleService` that handles:

1.  **The Architect**: Generates the 30-day price trajectory.
2.  **The Chronicler**: Generates news headlines explaining the price movement.
3.  **The Executor**: Analyzes user performance (post-simulation).

### **C. Simulation Logic**
- **`getScenario(type, symbol)`**:
  1.  **Fetch History**: Retrieve the last 90 days of *actual* historical price data for `symbol`.
  2.  **Check DB**: Look for an existing valid `SimulationScenario`.
  3.  **Generate/Return**:
      - If exists: Return cached scenario + `historicalData`.
      - If new: Call Gemini -> Save -> Return new scenario + `historicalData`.
  4.  **Consistency**: Ensure the generated trajectory *starts* exactly where the historical data *ends* to create a seamless line.

---

## **3. Action Plan**

### **Phase 1: Foundation & Schema**

- [ ] **Step 1.1**: Update `schema.prisma` with `SimulationScenario` model.
- [ ] **Step 1.2**: Run migration to update the database.

### **Phase 2: Gemini Integration**

- [ ] **Step 2.1**: Create `OracleAgentService`.
- [ ] **Step 2.2**: Implement **The Architect** prompt handling (Generates JSON trajectory).
- [ ] **Step 2.3**: Implement **The Chronicler** prompt handling (Generates JSON news).
- [ ] **Step 2.4**: Implement **The Executor** prompt handling (Post-mortem analysis).

### **Phase 3: Oracle Service Logic**

- [ ] **Step 3.1**: Create `OracleService` with `getScenario` method.
- [ ] **Step 3.2**: Implement Caching Logic (Read/Write to DB).
- [ ] **Step 3.3**: Create Controller `OracleController` with endpoints:
  - `GET /oracle/presets`: List available presets.
  - `POST /oracle/start`: Start a simulation (returns the full 30-day data blob).
  - `POST /oracle/analyze`: Submit results for Executor analysis.

### **Phase 4: Pro Mode (Realistic Outlook)**

- [ ] **Step 4.1**: Integrate with News API / internal news service to fetch real-time context.
- [ ] **Step 4.2**: Update Architect prompt to accept "Current News Context".
- [ ] **Step 4.3**: Add 24h expiry logic for `REALISTIC_OUTLOOK` presets.
- [ ] **Step 4.4**: Implement cleanup mechanism for expired scenarios (see Cleanup Strategy below).

### **Phase 5: Cleanup Strategy for Expired Scenarios**

To manage database storage efficiently, implement a cleanup mechanism for expired `SimulationScenario` records:

**Option A: Scheduled Cleanup Job (Recommended)**

- Create a NestJS `@Cron` job that runs daily at off-peak hours (e.g., 3:00 AM).
- Query for all `SimulationScenario` records where `expiresAt < NOW()`.
- Delete expired records in batches to avoid memory issues.
- Log cleanup statistics for monitoring.

**Option B: Cleanup on Access (Lazy Cleanup)**

- When querying for scenarios, filter out expired ones using Prisma's `where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }`.
- Periodically run a cleanup job to remove expired records that haven't been accessed.

**Option C: Database-Level Cleanup (PostgreSQL)**

- Use PostgreSQL's `pg_cron` extension to schedule a SQL job that deletes expired records.
- Alternative: Set up a TTL (Time-To-Live) policy if using a document store like MongoDB (not applicable for PostgreSQL).

**Recommended Implementation:**

1. Use **Option B** for immediate filtering in queries (already implemented in Phase 3).
2. Add **Option A** as a background cron job for proactive cleanup.
3. Expose a manual cleanup endpoint `DELETE /oracle/cleanup` (admin-only) for immediate maintenance.

**Cleanup Job Pseudocode:**

```typescript
@Cron('0 3 * * *') // Daily at 3:00 AM
async cleanupExpiredScenarios() {
  const expiredCount = await this.prisma.simulationScenario.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
  this.logger.log(`Cleaned up ${expiredCount.count} expired scenarios`);
}
```

---

## **4. Technical Details**

- **LLM Model**: Gemini 1.5 Flash.
- **Output Format**: Strictly JSON (enforced via prompt instructions and/or response schema if available).
- **Error Handling**: Fallback to a static "Safe Defaults" scenario if Gemini API fails.
