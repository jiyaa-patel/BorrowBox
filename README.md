# BorrowBox

BorrowBox is a peer-to-peer campus borrowing application that allows students to list, discover, and request items within their campus community.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Testing](#testing)
- [Framework Audit](#framework-audit)
- [Website Flow](#website-flow)

## Overview

BorrowBox provides a platform for students to share and borrow useful items within their campus community.

The application includes authentication, item listing and management, searching and filtering, borrowing requests, geolocation, dashboards, profiles, and administrative functionality.

## Features

- User authentication
- Item listing and management
- Browse and search items
- Search and filtering
- Geolocation support
- Borrowing requests
- Borrow list
- Dashboard
- User profile
- Admin functionality
- Shared landing page and navigation
- Safety information and FAQ

## Technology Stack

### Frontend

- HTML
- CSS
- JavaScript
- Bootstrap
- Tailwind CSS
- Vue 3

### Backend

- Node.js
- Express.js

### Database

- MySQL

## Project Structure

```text
BorrowBox/
│
├── client/       # Frontend files and user interface
├── server/       # Express backend and API implementation
├── database/     # Database configuration and initialization
├── tests/        # Project tests
│
├── .env.example
├── .env.test.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md