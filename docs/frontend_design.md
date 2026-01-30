# Stock Research Agent - Frontend Documentation

## Overview
This document outlines the design architecture and functionality of the Stock Research Agent frontend application. The application is built using **Next.js 16**, **Tailwind CSS**, and a custom **"Cosmic Gold"** design system.

## Design System
- **Theme**: Dark mode interface with deep blue/black backgrounds (`#0a0a0a`) and gold/amber accents.
- **Glassmorphism**: Extensive use of `backdrop-blur` and semi-transparent backgrounds (`bg-white/5`) to create depth and hierarchy.
- **Typography**: Inter (sans-serif) for UI elements, Monospace for financial data and numbers.
- **Grid Layouts**: 12-column grid system used for data visualization and list views.

---

## Page Functionality

### 1. Dashboard (`/dashboard`)
**Purpose**: The central command center providing a high-level overview of market status and account performance.

**Key Features**:
- **Bento Grid Layout**: Responsive, modular grid arranging widgets of varying sizes.
- **Key Metrics**: Real-time display of P&L, Active Plays count, and Win Rate.
- **Market Sentiment**: Visual widget indicating overall market direction (Bullish/Bearish).
- **Recent Activity**: Chronological feed of recent scans and trade updates.

### 2. Market Scan (`/scan`)
**Purpose**: Interface for viewing historical market scans and triggering new real-time scans.

**Key Features**:
- **Split Layout**:
    - **Sidebar (Left)**: Scrollable list of historical scans with timestamps and themes.
    - **Detail View (Right)**: Content area showing the selected scan's data.
- **Tabbed Results**: Data tables separated by "Top Gainers", "Top Losers", and "Most Active".
- **Visuals**: Trend indicators (green/red arrows) and relative volume data.
- **Action**: "Run New Scan" button to trigger the backend scanner agent.

### 3. Deep Dive Analysis (`/analyze`)
**Purpose**: Comprehensive AI-powered analysis of individual stock tickers.

**Key Features**:
- **Search Bar**: Prominent, centered input field for ticker lookup.
- **Metrics Grid**:
    - **Solvency Card**: Traffic-light system checks (Green/Red) for Operating Cash Flow.
    - **Volatility Profile**: Gauge showing 20-day volatility and risk category (Low/Med/High).
    - **Risk Assessment**: Visual gauge indicating the overall safety of the play.
- **AI Recommendation**: Natural language summary explaining the "Why" behind the rating.

### 4. Options Strategy Generator (`/strategy`)
**Purpose**: AI optimization tool that suggests specific option trade structures based on volatility and user capital.

**Key Features**:
- **Input Form**: Accepts Ticker Symbol and Capital Allocation amount.
- **Risk Tiers**: Generates three distinct strategy options:
    - **High Risk**: Aggressive directional plays (e.g., Long Calls).
    - **Medium Risk**: Balanced spreads (e.g., Bull Call Spreads).
    - **Low Risk**: Income generation (e.g., Credit Spreads).
- **Strategy Cards**: detailed visualization of each strategy, including:
    - Max Profit / Max Loss / Breakeven.
    - Win Probability.
    - Leg-by-leg breakdown table.
- **Conversion**: "Save to Plan" button to add a strategy to the portfolio.

### 5. Trade Plans Manager (`/plans`)
**Purpose**: Portfolio tracking tool for managing the lifecycle of trades (Planned → Open → Closed).

**Key Features**:
- **Kanban Filtering**: Tabs to filter views by status (All, Planned, Open, Closed).
- **Aligned List View**: Strictly aligned 12-column grid layout for consistent data presentation.
    - **Info**: Symbol, Strategy Type, Expiration.
    - **Metrics**: Max Profit, Win Probability.
    - **Status**: Visual badge indicating current state.
    - **Actions**: Context-aware buttons to transitions trades (e.g., "Open Trade", "Close").

---

## Technical Implementation Details
- **State Management**: React `useState` and `useEffect` for local UI state; ready for integrations with `TanStack Query` for server state.
- **Components**: Atomic design pattern with reusable UI components (Buttons, Cards, Badges) located in `src/components/ui`.
- **Styling**: Utility-first CSS using Tailwind, with custom configuration in `tailwind.config.ts` for brand colors.
