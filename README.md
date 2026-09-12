# SmartServe Hub (49)

SmartServe — Foundation V1

Build the foundation of a multi-tenant SaaS platform called SmartServe for restaurants, cafés, bars and hotels.

Branding

Primary Navy: #0A1F44

Accent Gold: #D4AF37

Background: #F8FAFC

Cards: #FFFFFF

Text: #0A1F44

Secondary text: #64748B

Use a premium, modern hospitality/business-dashboard aesthetic.

Navy should dominate; Gold should be used for important actions, highlights and active states.

Responsive on desktop, tablet and mobile.

1. Architecture

Build SmartServe as a multi-tenant SaaS platform.

Hierarchy:

SUPER ADMIN → CLIENT ORGANIZATION → BRANCHES → STAFF

Every restaurant/client must have isolated data.

Use a proper database structure with organization_id/tenant ownership on client data and implement strong role-based access and Row Level Security.

Design the database so future modules can be added without restructuring the entire system.

2. User Roles

Create these roles:

SUPER ADMIN

The SmartServe platform owner.

Can:

View all clients

View all branches

View all users

View all subscriptions

View platform analytics

Create/edit/suspend/reactivate clients

Change client subscription plans

Approve upgrades

Control feature access

View account usage

View billing/payment status

Access support/impersonation mode later

View audit logs

PLATFORM ADMIN

Can manage clients and provide support, but has fewer permissions than Super Admin.

CLIENT ADMIN

Restaurant/hotel owner or general manager.

Can only access their own organization:

Dashboard

Branches

Staff

Settings

Subscription

Analytics

Do NOT allow one organization to access another organization's data.

3. Super Admin Dashboard

Create a professional SmartServe Control Center.

Show:

Total Clients

Active Clients

Trial Clients

Suspended Clients

MRR

New Clients

Expiring Subscriptions

Failed Payments

Add visual analytics:

Client growth over time

MRR/revenue trend

Clients by subscription plan

Active vs suspended clients

Feature usage

New vs cancelled clients

Use clean line, bar and donut charts.

Use realistic mock data initially, clearly structured so it can later be replaced by real database data.

4. Clients Management

Create a Clients page with:

Search

Filter by plan

Filter by status

Sort

Client table

View client

Edit client

Suspend

Reactivate

Change plan

Client table should show:

Business name

Owner

Plan

Number of branches

Number of users

Status

Subscription expiry

Last activity

Clicking a client opens a detailed client profile.

5. Client Profile

Show:

Account

Business name

Owner

Email

Phone

Date joined

Account status

Subscription

Current plan

Price

Start date

Renewal date

Payment status

Trial status

Usage

Branches

Users

Orders

Tables

Menu items

Feature Access

Create toggles for:

QR Menu

Waiter Mode

KDS

Analytics

Inventory

M-Pesa

Multi-Branch

Advanced Reports

AI Insights

These should be controlled through database-driven feature flags, not hard-coded UI conditions.

6. Subscription System

Create subscription plans:

Starter

Growth

Pro

Enterprise

Each plan should have configurable:

Price

User limit

Branch limit

Table limit

Feature access

Create subscription statuses:

TRIAL

ACTIVE

PAYMENT_DUE

GRACE_PERIOD

SUSPENDED

CANCELLED

Do not delete client data when a subscription is suspended.

When suspended, show an account-suspended screen and prevent normal system usage while preserving all data.

Allow Super Admin to:

Approve upgrade

Change plan

Suspend

Reactivate

Extend trial

Change expiry date

7. Client Dashboard Foundation

Create a separate dashboard for CLIENT ADMIN.

Include placeholder/initial analytics cards:

Today's Revenue

Orders

Average Order Value

Estimated Gross Profit

Active Tables

Top Products

Add visual charts:

Revenue trend

Orders trend

Sales by payment method

Top products

Also create a section called:

Smart Alerts

Example alerts:

Kitchen preparation time is above target

Revenue is down compared with previous period

A product is selling unusually well

Food cost has increased

These can initially use mock data but should be structured for real analytics later.

8. Database

Create a clean relational database containing at minimum:

organizations

branches

users

roles

plans

subscriptions

feature_flags

organization_features

audit_logs

Prepare the schema for future tables:

restaurant_tables

menu_categories

menu_items

orders

order_items

payments

inventory

customers

staff_activity

Do not build the complete POS/KDS yet, but make the database architecture ready for them.

9. Security

Implement:

Authentication

Role-based authorization

Organization-level data isolation

Row Level Security

Protected routes

Secure admin routes

Audit logging for important Super Admin actions

Never expose other clients' data to Client Admin users.

10. Navigation

Super Admin

Dashboard
Clients
Subscriptions
Plans
Feature Control
Analytics
Users
Support
Audit Logs
Settings

Client Admin

Dashboard
Branches
Staff
Subscription
Analytics
Settings

Reserve future navigation items for:

Orders
Tables
Menu
KDS
Inventory
Payments
Customers

11. Important UX requirement

Make the application feel like a real SaaS product, not a generic admin template.

Use:

Clean cards

Strong visual hierarchy

Professional tables

Search/filter controls

Empty states

Loading states

Confirmation dialogs

Toast notifications

Responsive layouts

Accessible forms

Use Gold strategically rather than making the entire interface gold.

12. Important development rule

Do NOT build the full restaurant POS, waiter app, KDS, QR ordering, inventory, M-Pesa or AI system yet.

This first version is the SmartServe platform foundation.

The architecture must make it easy to add those modules later.

Make the code modular, reusable and production-oriented.

At the end, provide:

Database schema

Authentication

Super Admin dashboard

Client Admin dashboard

Client management

Subscription management

Feature flags

Role-based access

Organization data isolation

Analytics charts

Responsive branded UI

Use Navy #0A1F44 and Gold #D4AF37 consistently throughout the application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c08c1045-05ba-4ef6-bacd-e70266bba794).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
