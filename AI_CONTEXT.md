# Money-Watch Architecture & Context

## Project Overview
* **App Name:** Money-Watch
* **Core Stack:** React, TypeScript, Vite, Tailwind CSS, Supabase.
* **Primary Goal:** A real-time financial dashboard to track spending, set dynamic limits, and manage savings goals.

## Explicit Database Schema (Supabase)
This is the single source of truth for the database architecture. Do not assume or hallucinate columns outside of this list.

### 1. `users` Table
* `id` (uuid, primary key)
* `email` (text)
* `name` (text, nullable)
* `username` (text, nullable)
* `current_balance` (numeric, default 0)
* `savings_balance` (numeric, default 0)
* `bank_balance` (numeric, default 0)

### 2. `user_settings` Table
* `id` (uuid, primary key)
* `user_id` (uuid, foreign key to users.id)
* `daily_limit` (numeric, nullable)
* `weekly_limit` (numeric, nullable)
* `monthly_limit` (numeric, nullable)
* `daily_savings_goal` (numeric, nullable)
* `weekly_savings_goal` (numeric, nullable)
* `monthly_savings_goal` (numeric, nullable)

### 3. `transactions` Table
* `id` (uuid, primary key)
* `user_id` (uuid, foreign key to users.id)
* `amount` (numeric)
* `category` (text)
* `description` (text, nullable)
* `date` (timestamptz)
* `type` (text - e.g., 'expense', 'deposit', 'transfer')

### 4. `notifications` Table
* `id` (uuid, primary key)
* `user_id` (uuid, foreign key to users.id)
* `type` (text, NOT NULL - e.g., 'alert', 'info', 'transfer')
* `title` (text)
* `message` (text)
* `is_read` (boolean, default false)
* `created_at` (timestamptz, default now())

## Key Logic & UX Rules
* **The "Delaying the Save" Notification Pattern:** When a user marks a notification as read, the UI updates instantly (optimistic update), but the actual Supabase database update (`is_read: true`) is delayed by a 40-second `setTimeout`. This acts as a fail-safe in case of accidental refreshes or network drops.
* **Dynamic Limits:** Users can set their own spending limits and savings goals directly from the `SettingsView.tsx` UI. This data saves directly to the `user_settings` table, replacing any hardcoded app defaults.
* **Time-Travel Math:** The app filters `transactions` into Daily, Weekly, and Monthly buckets based on timestamps to compare against the user's defined limits in `user_settings`.

## Important Notes for AI Assistants
* Always refer to the app as **Money-Watch**, not "FinTrack" or a generic fintech app.
* Respect the existing Tailwind styling and Lucide icon usage when generating new UI components.
* Ensure all new state management or database queries rigidly account for the user's specific UUID via Supabase Auth.