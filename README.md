<div align="center">

# Database Systems Lab Project

### A complete, deliverable-based academic project covering the full lifecycle of relational database design and implementation.

[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![SQL](https://img.shields.io/badge/Language-SQL-F29111?style=for-the-badge&logo=postgresql&logoColor=white)](https://en.wikipedia.org/wiki/SQL)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Status](https://img.shields.io/badge/Status-Completed-success?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-Academic-blue?style=for-the-badge)]()

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Deliverables](#deliverables)
- [Concepts Covered](#concepts-covered)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Contributors](#contributors)

---

## Project Overview

This repository contains the complete work for a **Database Systems Lab** course project, developed in three structured deliverables. The project walks through every major phase of database engineering: gathering requirements, building an Entity-Relationship model, normalizing a relational schema, and implementing the full database using SQL.

The goal was to design a well-structured, normalized, and query-optimized relational database for a real-world domain problem, applying theory directly into practice.

---

## Repository Structure

```
Database-Systems-Lab-Project/
│
├── Deliverable 1/          # Requirements analysis and conceptual ER design
├── Deliverable 2/          # Logical schema design and normalization
└── Deliverable 3/          # Full SQL implementation, queries, and final report
```

---

## Deliverables

### Deliverable 1 -- Requirements and Conceptual Design

The first phase focuses on understanding the problem domain and building a conceptual model.

**What is included:**
- Problem statement and scope definition
- Entity-Relationship (ER) diagram with entities, attributes, and relationships
- Identification of primary keys, cardinality constraints, and participation types
- Initial data dictionary describing each entity and attribute

---

### Deliverable 2 -- Logical Design and Schema

The second phase translates the conceptual ER model into a relational schema ready for implementation.

**What is included:**
- Mapping of the ER diagram to relational tables
- Normalization up to Third Normal Form (3NF) to eliminate redundancy
- Refined schema with data types, domain constraints, and integrity rules
- Updated data dictionary with refined attribute details

---

### Deliverable 3 -- SQL Implementation and Final Report

The third phase covers the complete SQL implementation and advanced database features.

**What is included:**
- DDL scripts for creating tables with primary and foreign key constraints
- DML scripts for inserting and populating sample data
- SQL queries including joins, subqueries, aggregations, and views
- Stored procedures and triggers (where applicable)
- Query optimization considerations
- Final project report and documentation

---

## Concepts Covered

| Concept | Description |
|---|---|
| ER Modeling | Designing entities, attributes, and relationships |
| Relational Mapping | Converting ER diagrams to relational tables |
| Normalization | Applying 1NF, 2NF, and 3NF to eliminate anomalies |
| DDL | Creating and managing database schemas |
| DML | Inserting, updating, and deleting records |
| SQL Queries | Joins, subqueries, aggregations, and views |
| Constraints | Primary keys, foreign keys, unique, not null, and check |
| Triggers and Procedures | Automating database logic and enforcing business rules |
| Query Optimization | Writing efficient SQL for better performance |

---

## Technologies Used

| Tool / Technology | Purpose |
|---|---|
| MySQL | Primary relational database management system |
| SQL (DDL + DML) | Schema creation, data manipulation, and querying |
| MySQL Workbench | Visual schema design and query execution |
| draw.io / Lucidchart | ER diagram creation |
| Python (mysql-connector) | Scripted database interaction (where applicable) |
| VS Code | Code editing and file management |

---

## Getting Started

Follow these steps to set up and run the database locally.

**Prerequisites:**
- MySQL Server (v8.0 or above recommended)
- MySQL Workbench or any compatible SQL client

**Steps:**

1. Clone the repository:
   ```bash
   git clone https://github.com/AbdulAzeemHashmi/Database-Systems-Lab-Project.git
   cd Database-Systems-Lab-Project
   ```

2. Open your MySQL client and create a new database:
   ```sql
   CREATE DATABASE db_lab_project;
   USE db_lab_project;
   ```

3. Navigate to **Deliverable 3** and run the DDL script to create the schema:
   ```sql
   SOURCE 'Deliverable 3/schema.sql';
   ```

4. Populate the tables with sample data:
   ```sql
   SOURCE 'Deliverable 3/data.sql';
   ```

5. Run the provided queries to test and verify the implementation:
   ```sql
   SOURCE 'Deliverable 3/queries.sql';
   ```

> Note: File names may vary. Check the contents of each deliverable folder for the exact script names.

---

## Contributors

This project was developed as a collaborative team effort for the **Database Systems Lab** course.

| Name | GitHub |
|---|---|
| Abdul Azeem | [@AbdulAzeemHashmi](https://github.com/AbdulAzeemHashmi) |
| Diya Hurmat | Add GitHub link |
| M. Umair Ahmed | Add GitHub link |

---

<div align="center">

*Submitted as part of the Database Systems Lab course.*

*Rawalpindi, Pakistan*

</div>
