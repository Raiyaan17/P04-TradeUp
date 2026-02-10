# Market Oracle Feature - Frontend Context & Action Plan

## **1. Feature Overview**
The **Market Oracle** UI allows users to select a simulation preset and watch a 30-day market scenario unfold in accelerated time (e.g., 10 seconds = 1 day).
Verified existing components should be reused where possible.

**Key Frontend Responsibilities:**
1.  **Preset Selection**: A visually appealing grid to choose the scenario.
2.  **Simulation Runner**: A collaborative view showing the Chart and News simultaneously.
3.  **Visualization**: High-performance charting (Lightweight Charts) to render the trajectory.

---

## **2. UI Architecture**

### **A. Page Structure**
- **`/oracle`**: Main entry point.
- **Layout**:
    - **Header**: Title and "Credits/Balance".
    - **Main Content**: Swaps between `PresetSelection` and `ActiveSimulation`.

### **B. Core Components**
1.  **`OraclePresetGrid`**:
    - Displays 4 cards: "The Steady Climb", "The Flash Crash", "The IMF Rollercoaster", "The 30-Day Oracle" (Pro).
    - Pro card shows a "Lock" icon if user is not eligible or "Refresh" timer.
2.  **`SimulationRunner`**:
    - **Left Col (Chart)**: The `MarketChart` component.
    - **Right Col (News)**: The `NewsFeed` component.
    - **Bottom**: Simulation controls (Pause, Speed Up, Exit).
3.  **`MarketChart`**:
    - **Library**: `lightweight-charts` (use `AreaSeries` for the "mountain" look with gradient fill, similar to Highcharts/Yahoo Finance).
    - **Visuals**:
        - **Historical Data**: Load and render the past 90 days of *real* price action immediately as a static curve.
        - **Simulation**: Append the new "future" points to this series in real-time.
        - **Seamlessness**: Ensure the transition from the last historical point to the first simulation point is smooth (no gaps).
    - **Features**: Crosshair, simple moving average (optional) for "trend" context.
4.  **`NewsTicker`**:
    - Displays headlines appearing at specific "Days".
    - Needs animation for new items.

### **C. State Management**
We need a local store (or React Context) for the active simulation session:
```typescript
interface SimulationState {
  status: 'IDLE' | 'LOADING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  scenarioData: TrajectoryData | null;
  currentDay: number; // 0 to 29
  speed: number; // 1x, 2x
}
```

---

## **3. Action Plan**

### **Phase 1: UI Shell & Routing**
- [ ] **Step 1.1**: Create `app/oracle/page.tsx` (or `pages/oracle.tsx` depending on router).
- [ ] **Step 1.2**: Implement `OraclePresetGrid` with static data.
- [ ] **Step 1.3**: Add navigation to the main menu.

### **Phase 2: Simulation Components**
- [ ] **Step 2.1**: Implement `MarketChart` using Lightweight Charts.
    - Ensure it can accept an array of points.
- [ ] **Step 2.2**: Implement `NewsTicker` component.
    - Design for readability and "breaking news" effect.
- [ ] **Step 2.3**: Build the `SimulationRunner` layout container.

### **Phase 3: Integration & Logic**
- [ ] **Step 3.1**: Integrate API Loop.
    - `POST /oracle/start` -> Receive JSON.
- [ ] **Step 3.2**: Implement "Tick Engine".
    - `setInterval` based loop.
    - On each tick: Update `currentDay`, push new point to Chart, reveal News for that day.
- [ ] **Step 3.3**: Handle Completion.
    - Show `ResultsSummary` modal/view.
    - `POST /oracle/analyze` to get LLM feedback.

### **Phase 4: Polish**
- [ ] **Step 4.1**: Add sound effects (optional) for news flashes or market crashes.
- [ ] **Step 4.2**: Optimize Chart performance (ensure no re-renders of the whole page on every tick).

---

## **4. Technical Details**
- **Charting Library**: `lightweight-charts` (TradingView) recommended for performance.
- **State**: `zustand` or React `useState` + `useRef` for the interval.
- **Responsiveness**: Ensure the chart and news feed stack correctly on mobile.
