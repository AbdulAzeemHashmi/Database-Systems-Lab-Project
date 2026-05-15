<div align="center">

<h1>🗄️ Database Systems Lab Project</h1>

<p>A complete, multi-phase academic project covering the full lifecycle of relational database design and implementation, from conceptual modeling to full SQL deployment.</p>

<p>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL"/>
  <img src="https://img.shields.io/badge/SQL-F29111?style=for-the-badge&logo=databricks&logoColor=white" alt="SQL"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Status-Completed-brightgreen?style=for-the-badge" alt="Status"/>
  <img src="https://img.shields.io/badge/Course-Database%20Systems%20Lab-blueviolet?style=for-the-badge" alt="Course"/>
</p>

</div>

---

## 📚 Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Deliverable 1 -- Requirements and Conceptual Design](#deliverable-1----requirements-and-conceptual-design)
- [Deliverable 2 -- Logical Design and Schema](#deliverable-2----logical-design-and-schema)
- [Deliverable 3 -- Implementation and Final Report](#deliverable-3----implementation-and-final-report)
- [Core Concepts Applied](#core-concepts-applied)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Contributors](#contributors)

---

## 📌 Overview

This repository contains all project work submitted for the **Database Systems Lab** course. The project is organized into three progressive deliverables, each building on the previous phase.

The project covers:

- Gathering and documenting system requirements
- Designing an Entity-Relationship (ER) model
- Converting the ER model into a normalized relational schema
- Implementing the full database using SQL with real data and queries

---

## 📁 Repository Structure

```
Database-Systems-Lab-Project/
│
├── Deliverable 1/        # Requirements analysis and ER diagram
├── Deliverable 2/        # Relational schema and normalization
└── Deliverable 3/        # Full SQL implementation and final report
```

---

## 📦 Deliverable 1 -- Requirements and Conceptual Design

This phase focuses on understanding the problem domain and producing a conceptual model.

**Includes:**

- Problem statement and system scope
- Entity-Relationship (ER) diagram
- Entity and attribute definitions
- Relationship types with cardinality and participation constraints
- Initial data dictionary

---

## 📦 Deliverable 2 -- Logical Design and Schema

This phase translates the conceptual ER model into a concrete relational schema.

**Includes:**

- Mapping of ER diagram to relational tables
- Normalization up to Third Normal Form (3NF)
- Data types, domain constraints, and integrity rules
- Updated and refined data dictionary

---

## 📦 Deliverable 3 -- Implementation and Final Report

This phase covers the complete SQL implementation and advanced database features.

**Includes:**

- DDL scripts: `CREATE TABLE` with primary keys, foreign keys, and constraints
- DML scripts: data insertion and population with sample records
- SQL queries: joins, subqueries, aggregations, grouping, and views
- Stored procedures and triggers (where applicable)
- Final project report with full documentation

---

## 🧠 Core Concepts Applied

| Concept | Description |
|---|---|
| ER Modeling | Entities, attributes, relationships, and constraints |
| Relational Mapping | Systematic conversion of ER diagrams to tables |
| Normalization | 1NF, 2NF, and 3NF to eliminate data anomalies |
| DDL | Schema definition using `CREATE`, `ALTER`, `DROP` |
| DML | Data management using `INSERT`, `UPDATE`, `DELETE` |
| SQL Queries | Joins, subqueries, aggregate functions, and views |
| Integrity Constraints | Primary keys, foreign keys, `UNIQUE`, `NOT NULL`, `CHECK` |
| Stored Procedures | Reusable SQL logic encapsulated in the database |
| Triggers | Automatic actions in response to data events |
| Query Optimization | Efficient query writing for better performance |

---

## 🛠️ Tech Stack

| Tool / Technology | Role |
|---|---|
| MySQL | Primary relational database management system |
| SQL (DDL + DML) | Schema creation, data manipulation, and querying |
| MySQL Workbench | Visual schema design and SQL execution |
| draw.io / Lucidchart | ER diagram creation and export |
| Python + mysql-connector | Scripted database interaction (if applicable) |
| VS Code | Script editing and project management |

---

## 🚀 Getting Started

### Prerequisites

- MySQL Server 8.0 or above
- MySQL Workbench or any compatible SQL client

### Setup Steps

**1. Clone the repository**

```bash
git clone https://github.com/AbdulAzeemHashmi/Database-Systems-Lab-Project.git
cd Database-Systems-Lab-Project
```

**2. Create the database**

```sql
CREATE DATABASE db_lab_project;
USE db_lab_project;
```

**3. Create the schema (from Deliverable 3)**

```sql
SOURCE 'Deliverable 3/schema.sql';
```

**4. Insert sample data**

```sql
SOURCE 'Deliverable 3/data.sql';
```

**5. Run the queries**

```sql
SOURCE 'Deliverable 3/queries.sql';
```

> File names may differ. Check the contents of each deliverable folder for exact filenames.

---

## 👥 Contributors

This project was developed as a collaborative team effort.

| Name | GitHub Profile |
|---|---|
| Abdul Azeem | [@AbdulAzeemHashmi](https://github.com/AbdulAzeemHashmi) |
| Diya Hurmat | |
| M. Umair Ahmed ||

---

<div align="center">

<sub>Submitted as part of the Database Systems Lab course &nbsp;|&nbsp; Rawalpindi, Pakistan</sub>

</div>
