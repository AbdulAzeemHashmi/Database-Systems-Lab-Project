# Database Systems Lab Project

A structured, multi-deliverable database systems lab project developed as part of an academic Database Systems course. The project covers the full lifecycle of database design and implementation, from conceptual modeling through to query optimization and application integration.

---

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Deliverables](#deliverables)
  - [Deliverable 1 - Requirements and Conceptual Design](#deliverable-1----requirements-and-conceptual-design)
  - [Deliverable 2 - Logical Design and Schema Implementation](#deliverable-2----logical-design-and-schema-implementation)
  - [Deliverable 3 - Queries, Constraints, and Final Implementation](#deliverable-3----queries-constraints-and-final-implementation)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Contributors](#contributors)

---

## Overview

This project demonstrates the end-to-end process of designing and building a relational database system. It follows a deliverable-based structure, with each phase building on the previous one. The project applies core concepts from database theory including entity-relationship modeling, relational schema design, normalization, SQL programming, and constraint enforcement.

---

## Repository Structure

```
Database-Systems-Lab-Project/
│
├── Deliverable 1/          # Requirements gathering and ER diagram
├── Deliverable 2/          # Relational schema and logical design
└── Deliverable 3/          # SQL implementation, queries, and final report
```

---

## Deliverables

### Deliverable 1 - Requirements and Conceptual Design

This phase focuses on understanding the problem domain and producing a conceptual model of the database.

Key components:
- Problem statement and system requirements
- Entity-Relationship (ER) diagram with entities, attributes, and relationships
- Identification of primary keys, foreign keys, and cardinality constraints
- Initial data dictionary

### Deliverable 2 - Logical Design and Schema Implementation

This phase translates the conceptual model into a relational schema ready for implementation.

Key components:
- Conversion of the ER diagram to relational tables
- Normalization up to Third Normal Form (3NF)
- Refined schema with data types, constraints, and integrity rules
- Updated data dictionary

### Deliverable 3 - Queries, Constraints, and Final Implementation

This phase covers the full SQL implementation and advanced database features.

Key components:
- DDL scripts for table creation with primary and foreign key constraints
- DML scripts for data insertion and population
- SQL queries including joins, subqueries, aggregations, and views
- Stored procedures, triggers, or functions (where applicable)
- Final project report and documentation

---

## Technologies Used

- **Database:** MySQL / Oracle SQL (or the DBMS used in your course)
- **Query Language:** SQL (DDL + DML)
- **Design Tools:** ER diagram tools (e.g., draw.io, Lucidchart, or MySQL Workbench)
- **Documentation:** PDF / Word reports per deliverable

---

## Getting Started

To set up and run the database on your local machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/AbdulAzeemHashmi/Database-Systems-Lab-Project.git
   ```

2. Navigate to the relevant deliverable folder.

3. Open your preferred database client (e.g., MySQL Workbench, SQL*Plus, pgAdmin).

4. Run the DDL script to create the schema:
   ```sql
   SOURCE path/to/schema.sql;
   ```

5. Populate the tables using the DML script:
   ```sql
   SOURCE path/to/data.sql;
   ```

6. Execute the provided queries to verify the implementation.

---

## Contributors

This project was developed collaboratively by a team of three members as part of the Database Systems Lab course.

- **Abdul Azeem Hashmi** - [GitHub](https://github.com/AbdulAzeemHashmi)
- Contributor 2
- Contributor 3

---

> This repository is submitted for academic purposes as part of a Database Systems Lab course.
