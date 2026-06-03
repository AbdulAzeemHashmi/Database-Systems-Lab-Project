<div align="center">  
 
<h1>🗄️ Database Systems Lab Project</h1> 

<p>A complete, multi-phase academic project covering the full lifecycle of relational database design and implementation, from conceptual modeling to a fully functional web-based application.</p>   

<p>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/SQL-F29111?style=for-the-badge&logo=databricks&logoColor=white" alt="SQL"/>
  <img src="https://img.shields.io/badge/Status-Completed-brightgreen?style=for-the-badge" alt="Status"/>
</p>

</div>

---

## 📚 Table of Contents
 
- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Deliverable 1 - Requirements and Conceptual Design](#deliverable-1----requirements-and-conceptual-design)
- [Deliverable 2 - Logical Design and Schema](#deliverable-2----logical-design-and-schema)
- [Deliverable 3 - Implementation and Final Report](#deliverable-3----implementation-and-final-report)
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
- Implementing the full database with a web-based frontend built using HTML, CSS, and JavaScript

---

## 📁 Repository Structure

```
Database-Systems-Lab-Project/
│
├── Deliverable 1/        # Requirements analysis and ER diagram
├── Deliverable 2/        # Relational schema and normalization
└── Deliverable 3/        # Full implementation and final report
```

---

## 📦 Deliverable 1 - Requirements and Conceptual Design

This phase focuses on understanding the problem domain and producing a conceptual model.

**Includes:**

- Problem statement and system scope
- Entity-Relationship (ER) diagram
- Entity and attribute definitions
- Relationship types with cardinality and participation constraints
- Initial data dictionary

---

## 📦 Deliverable 2 - Logical Design and Schema

This phase translates the conceptual ER model into a concrete relational schema.

**Includes:**

- Mapping of ER diagram to relational tables
- Normalization up to Third Normal Form (3NF)
- Data types, domain constraints, and integrity rules
- Updated and refined data dictionary

---

## 📦 Deliverable 3 - Implementation and Final Report

This phase covers the complete implementation including the web frontend and database backend.

**Includes:**

- Web interface built with HTML, CSS, and JavaScript
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
| Relational Mapping | Systematic conversion of ER diagrams to relational tables |
| Normalization | 1NF, 2NF, and 3NF to eliminate data anomalies |
| DDL | Schema definition using `CREATE`, `ALTER`, `DROP` |
| DML | Data management using `INSERT`, `UPDATE`, `DELETE` |
| SQL Queries | Joins, subqueries, aggregate functions, and views |
| Integrity Constraints | Primary keys, foreign keys, `UNIQUE`, `NOT NULL`, `CHECK` |
| Web Integration | Connecting the database backend to an HTML/CSS/JS frontend |
| Stored Procedures | Reusable SQL logic encapsulated in the database |
| Triggers | Automatic actions fired in response to data events |

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Frontend structure and page layout |
| CSS3 | Styling, responsiveness, and visual design |
| JavaScript | Frontend logic and dynamic database interactions |
| SQL (DDL + DML) | Schema creation, data manipulation, and querying |
| MySQL / SQL Server | Relational database management system |
| draw.io / Lucidchart | ER diagram design and export |

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge)
- MySQL Server 8.0 or above (or compatible DBMS)
- A local server environment such as XAMPP or WAMP (if using PHP/JS backend)

### Setup Steps

**1. Clone the repository**

```bash
git clone https://github.com/AbdulAzeemHashmi/Database-Systems-Lab-Project.git
cd Database-Systems-Lab-Project
```

**2. Set up the database**

Open your SQL client and run:

```sql
CREATE DATABASE db_lab_project;
USE db_lab_project;
SOURCE 'Deliverable 3/schema.sql';
SOURCE 'Deliverable 3/data.sql';
```

**3. Launch the frontend**

Open the main HTML file in your browser:

```bash
open "Deliverable 3/index.html"
```

Or place the project folder inside your local server's `htdocs` / `www` directory and access it via `http://localhost/Database-Systems-Lab-Project/`.

---

## 👥 Contributors

This project was collaboratively developed by the following team members:

<div align="center">

| Name | Email |
|---|---|
| M. Umair Ahmed | [i242545@isb.nu.edu.pk](mailto:i242545@isb.nu.edu.pk) |
| Diya Hurmat | [i240094@isb.nu.edu.pk](mailto:i240094@isb.nu.edu.pk) |
| Abdul Azeem | [i242013@isb.nu.edu.pk](mailto:i242013@isb.nu.edu.pk) |

</div>

---   

<div align="center">
  <p>Made with ❤️ for Database Systems Lab &nbsp;|&nbsp; FAST-NUCES Islamabad</p>
</div>
