import SQLite from 'react-native-sqlite-storage';

// Use callback API, not promises - this is what the library supports best
SQLite.enablePromise(false);

// Global database connection
let db = null;

// Initialize database
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    console.log("Initializing SQLite database...");
    
    try {
      // Open database
      db = SQLite.openDatabase(
        { name: 'vaxicare.db', location: 'default' },
        () => {
          console.log("Database connection established");
          createTables()
            .then(() => resolve(true))
            .catch(err => {
              console.error("Error creating tables:", err);
              reject(err);
            });
        },
        error => {
          console.error("Error opening database:", error);
          reject(error);
        }
      );
    } catch (error) {
      console.error("Exception in database initialization:", error);
      reject(error);
    }
  });
};

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    console.log("Creating database tables...");
    
    // Execute all table creation in a single transaction
    db.transaction(tx => {
      // Users table - ONLY for regular users
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          password TEXT,
          name TEXT,
          phone TEXT,
          address TEXT,
          createdAt TEXT
        )`,
        [],
        () => console.log("Users table created"),
        (_, error) => {
          console.error("Error creating users table:", error);
          return false;
        }
      );
      
      // Hospitals table - ONLY for hospitals
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS hospitals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE,
          password TEXT,
          location TEXT,
          type TEXT,
          vaccines TEXT,
          createdAt TEXT
        )`,
        [],
        () => console.log("Hospitals table created"),
        (_, error) => {
          console.error("Error creating hospitals table:", error);
          return false;
        }
      );
      
      // Family members table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS family_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          name TEXT,
          relation TEXT,
          age INTEGER,
          gender TEXT,
          medicalConditions TEXT,
          createdAt TEXT
        )`,
        [],
        () => console.log("Family members table created"),
        (_, error) => {
          console.error("Error creating family_members table:", error);
          return false;
        }
      );
      
      // Appointments table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          hospitalId INTEGER,
          familyMemberId INTEGER,
          vaccine TEXT,
          date TEXT,
          time TEXT,
          status TEXT,
          createdAt TEXT
        )`,
        [],
        () => console.log("Appointments table created"),
        (_, error) => {
          console.error("Error creating appointments table:", error);
          return false;
        }
      );
      
      // Vaccine inventory table - NEW
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS vaccine_inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hospitalId INTEGER,
          vaccineName TEXT,
          quantity INTEGER,
          minAge INTEGER,
          maxAge INTEGER,
          description TEXT,
          updatedAt TEXT,
          FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE,
          UNIQUE(hospitalId, vaccineName)
        )`,
        [],
        () => console.log("Vaccine inventory table created"),
        (_, error) => {
          console.error("Error creating vaccine_inventory table:", error);
          return false;
        }
      );

      // Reports table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patientId INTEGER,
          patientName TEXT,
          description TEXT,
          reportData TEXT,
          createdBy INTEGER,
          createdByType TEXT,
          imageData TEXT,
          createdAt TEXT
        )`,
        [],
        () => console.log("Reports table created"),
        (_, error) => {
          console.error("Error creating reports table:", error);
          return false;
        }
      );
    }, 
    error => {
      console.error("Transaction error:", error);
      reject(error);
    }, 
    () => {
      console.log("Tables created successfully");
      resolve();
    });
  });
};

// Insert a user
export const insertUser = (user) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!user || !user.email || !user.name) {
      reject(new Error("Invalid user data"));
      return;
    }
    
    const createdAt = user.createdAt || new Date().toISOString();
    
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO users (email, password, name, phone, address, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.email.toLowerCase(),
          user.password || '',
          user.name,
          user.phone || '',
          user.address || '',
          createdAt
        ],
        (_, result) => {
          const id = result.insertId;
          resolve({ id, ...user, createdAt, userType: 'user' });
        },
        (_, error) => {
          console.error("Error inserting user:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get all users
export const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM users",
        [],
        (_, result) => {
          const users = [];
          const len = result.rows.length;
          
          for (let i = 0; i < len; i++) {
            const user = result.rows.item(i);
            // Don't return password
            const { password, ...userWithoutPassword } = user;
            // Add userType for consistency
            users.push({...userWithoutPassword, userType: 'user'});
          }
          
          resolve(users);
        },
        (_, error) => {
          console.error("Error getting users:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get user by email
export const getUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!email) {
      reject(new Error("Email is required"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM users WHERE email = ?",
        [email.toLowerCase()],
        (_, result) => {
          if (result.rows.length > 0) {
            const user = result.rows.item(0);
            // Add userType field
            resolve({...user, userType: 'user'});
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error("Error getting user by email:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get hospital by email
export const getHospitalByEmail = (email) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!email) {
      reject(new Error("Email is required"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM hospitals WHERE email = ?",
        [email.toLowerCase()],
        (_, result) => {
          if (result.rows.length > 0) {
            const hospital = result.rows.item(0);
            // Add userType field
            resolve({...hospital, userType: 'hospital'});
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error("Error getting hospital by email:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Authenticate user or hospital
export const authenticateUser = (email, password, userType = 'user') => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!email || !password) {
      reject(new Error("Email and password are required"));
      return;
    }
    
    // Select the appropriate table based on userType
    const tableName = userType === 'hospital' ? 'hospitals' : 'users';
    
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM ${tableName} WHERE email = ? AND password = ?`,
        [email.toLowerCase(), password],
        (_, result) => {
          if (result.rows.length > 0) {
            const user = result.rows.item(0);
            // Don't return password
            const { password, ...userWithoutPassword } = user;
            
            // Add userType explicitly
            const authenticatedUser = {
              ...userWithoutPassword,
              userType: userType
            };
            
            resolve(authenticatedUser);
          } else {
            resolve(null);
          }
        },
        (_, error) => {
          console.error(`Error authenticating ${userType}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Insert a hospital
export const insertHospital = (hospital) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!hospital || !hospital.name) {
      reject(new Error("Invalid hospital data: missing name"));
      return;
    }
    
    const createdAt = hospital.createdAt || new Date().toISOString();
    
    console.log(`Inserting hospital with: ${JSON.stringify({
      name: hospital.name,
      email: hospital.email || '',
      location: hospital.location || '',
      type: hospital.type || ''
    })}`);
    
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO hospitals (name, email, password, location, type, vaccines, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          hospital.name,
          hospital.email || '',
          hospital.password || '',
          hospital.location || '',
          hospital.type || '',
          hospital.vaccines || '',
          createdAt
        ],
        (_, result) => {
          const id = result.insertId;
          console.log(`Successfully inserted hospital with ID: ${id}`);
          resolve({ id, ...hospital, createdAt, userType: 'hospital' });
        },
        (_, error) => {
          console.error(`Error inserting hospital: ${hospital.name}`, error);
          console.error(`SQL error code: ${error.code}, message: ${error.message}`);
          reject(error);
          return false;
        }
      );
    }, error => {
      console.error("Transaction error in insertHospital:", error);
      reject(error);
    });
  });
};

// Get all hospitals
export const getAllHospitals = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM hospitals",
        [],
        (_, result) => {
          const hospitals = [];
          const len = result.rows.length;
          
          for (let i = 0; i < len; i++) {
            const hospital = result.rows.item(i);
            // Don't return password
            const { password, ...hospitalWithoutPassword } = hospital;
            // Add userType field
            hospitals.push({
              ...hospitalWithoutPassword,
              userType: 'hospital'
            });
          }
          
          console.log(`Found ${hospitals.length} hospitals`);
          resolve(hospitals);
        },
        (_, error) => {
          console.error("Error getting hospitals:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get hospitals by location
export const getHospitalsByLocation = (location) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    // Normalize search input
    const searchTerm = location ? location.trim() : '';
    console.log(`Searching hospitals with location LIKE '%${searchTerm}%'`);
    
    // Debug: List all hospitals regardless of search term
    db.transaction(tx => {
      // First, log all hospitals for debugging
      tx.executeSql(
        "SELECT * FROM hospitals",
        [],
        (_, allResults) => {
          console.log("DEBUG: All hospitals in database:");
          const totalHospitals = allResults.rows.length;
          
          for (let i = 0; i < totalHospitals; i++) {
            const h = allResults.rows.item(i);
            console.log(`Hospital ${i+1}: ${h.name} - Location: "${h.location}" - Email: "${h.email}"`);
          }
          
          if (totalHospitals === 0) {
            console.log("No hospitals found in database at all!");
          }
          
          // Now perform the actual search with more flexible criteria
          if (searchTerm) {
            // More flexible search - look in name, location, and type fields
            const flexibleSql = `
              SELECT * FROM hospitals
              WHERE location LIKE ? COLLATE NOCASE
              OR name LIKE ? COLLATE NOCASE
              OR type LIKE ? COLLATE NOCASE
              ORDER BY 
                CASE 
                  WHEN location LIKE ? THEN 1
                  WHEN name LIKE ? THEN 2
                  ELSE 3
                END,
                name
            `;
            
            const searchPattern = `%${searchTerm}%`;
            const flexibleParams = [
              searchPattern, // for location
              searchPattern, // for name
              searchPattern, // for type
              searchPattern, // for ORDER BY location
              searchPattern  // for ORDER BY name
            ];
            
            console.log(`Using flexible search with pattern: ${searchPattern}`);
            
            tx.executeSql(
              flexibleSql,
              flexibleParams,
              (_, result) => {
                const hospitals = [];
                const len = result.rows.length;
                
                for (let i = 0; i < len; i++) {
                  const hospital = result.rows.item(i);
                  console.log(`MATCH: Hospital ${i+1}: ${hospital.name} - Location: "${hospital.location}" matched search "${searchTerm}"`);
                  
                  // Don't return password
                  const { password, ...hospitalWithoutPassword } = hospital;
                  // Add userType field
                  hospitals.push({
                    ...hospitalWithoutPassword,
                    userType: 'hospital'
                  });
                }
                
                console.log(`Found ${hospitals.length} hospitals matching '${searchTerm}' with flexible search`);
                resolve(hospitals);
              },
              (_, error) => {
                console.error("Error in flexible hospital search:", error);
                reject(error);
                return false;
              }
            );
          } else {
            // No search term, return all hospitals
            const hospitals = [];
            
            for (let i = 0; i < totalHospitals; i++) {
              const hospital = allResults.rows.item(i);
              // Don't return password
              const { password, ...hospitalWithoutPassword } = hospital;
              // Add userType field
              hospitals.push({
                ...hospitalWithoutPassword,
                userType: 'hospital'
              });
            }
            
            console.log(`Returning all ${hospitals.length} hospitals (no search term)`);
            resolve(hospitals);
          }
        },
        (_, error) => {
          console.error("Error getting all hospitals for debugging:", error);
          // Continue with the search anyway
          performSearch();
        }
      );
    });
    
    // Fallback search function if the debug listing fails
    function performSearch() {
      const sql = `
        SELECT * FROM hospitals
        ${searchTerm ? "WHERE location LIKE ? COLLATE NOCASE" : ""}
        ORDER BY name
      `;
      
      const params = searchTerm ? [`%${searchTerm}%`] : [];
      
      db.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => {
            const hospitals = [];
            const len = result.rows.length;
            
            for (let i = 0; i < len; i++) {
              const hospital = result.rows.item(i);
              // Don't return password
              const { password, ...hospitalWithoutPassword } = hospital;
              // Add userType field
              hospitals.push({
                ...hospitalWithoutPassword,
                userType: 'hospital'
              });
            }
            
            console.log(`Found ${hospitals.length} hospitals ${searchTerm ? `matching '${searchTerm}'` : ''}`);
            resolve(hospitals);
          },
          (_, error) => {
            console.error("Error getting hospitals by location:", error);
            reject(error);
            return false;
          }
        );
      });
    }
  });
};

// Add family member
export const addFamilyMember = (familyMember, userId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!familyMember || !familyMember.name || !userId) {
      reject(new Error("Invalid family member data or user ID"));
      return;
    }
    
    const createdAt = familyMember.createdAt || new Date().toISOString();
    
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO family_members (userId, name, relation, age, gender, medicalConditions, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          familyMember.name,
          familyMember.relation || '',
          familyMember.age || 0,
          familyMember.gender || '',
          familyMember.medicalConditions || '',
          createdAt
        ],
        (_, result) => {
          const id = result.insertId;
          resolve({ id, userId, ...familyMember, createdAt });
        },
        (_, error) => {
          console.error("Error adding family member:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get family members by user ID
export const getFamilyMembersByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error("Database not initialized when getting family members");
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!userId) {
      console.error("User ID is required to get family members");
      reject(new Error("User ID is required"));
      return;
    }
    
    console.log(`Querying family members for user ID: ${userId}`);
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM family_members WHERE userId = ?",
        [userId],
        (_, result) => {
          const familyMembers = [];
          const len = result.rows.length;
          
          console.log(`Found ${len} family members in database`);
          
          for (let i = 0; i < len; i++) {
            const member = result.rows.item(i);
            console.log(`  - Family member: ${member.name} (ID: ${member.id})`);
            familyMembers.push(member);
          }
          
          resolve(familyMembers);
        },
        (_, error) => {
          console.error("SQL Error getting family members:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Create appointment
export const createAppointment = (appointment) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!appointment || !appointment.userId || !appointment.hospitalId) {
      reject(new Error("Invalid appointment data"));
      return;
    }
    
    const createdAt = appointment.createdAt || new Date().toISOString();
    
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO appointments (userId, hospitalId, familyMemberId, vaccine, date, time, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          appointment.userId,
          appointment.hospitalId,
          appointment.familyMemberId || null,
          appointment.vaccine || '',
          appointment.date || '',
          appointment.time || '',
          appointment.status || 'pending',
          createdAt
        ],
        (_, result) => {
          const id = result.insertId;
          resolve({ id, ...appointment, createdAt });
        },
        (_, error) => {
          console.error("Error creating appointment:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get appointments by user ID
export const getAppointmentsByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!userId) {
      reject(new Error("User ID is required"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        `SELECT a.*, h.name as hospitalName, f.name as familyMemberName
         FROM appointments a
         LEFT JOIN hospitals h ON a.hospitalId = h.id
         LEFT JOIN family_members f ON a.familyMemberId = f.id
         WHERE a.userId = ?`,
        [userId],
        (_, result) => {
          const appointments = [];
          const len = result.rows.length;
          
          for (let i = 0; i < len; i++) {
            appointments.push(result.rows.item(i));
          }
          
          resolve(appointments);
        },
        (_, error) => {
          console.error("Error getting appointments:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get appointments by hospital ID
export const getAppointmentsByHospitalId = (hospitalId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!hospitalId) {
      reject(new Error("Hospital ID is required"));
      return;
    }
    
    console.log(`Getting appointments for hospital ID: ${hospitalId}`);
    
    db.transaction(tx => {
      tx.executeSql(
        `SELECT a.*, u.name as userName, f.name as familyMemberName, 
                f.age as patientAge, f.gender as patientGender, 
                f.medicalConditions as patientMedicalConditions,
                f.relation as patientRelation
         FROM appointments a
         LEFT JOIN users u ON a.userId = u.id
         LEFT JOIN family_members f ON a.familyMemberId = f.id
         WHERE a.hospitalId = ?`,
        [hospitalId],
        (_, result) => {
          const appointments = [];
          const len = result.rows.length;
          
          console.log(`Found ${len} appointments for hospital ID ${hospitalId}`);
          
          for (let i = 0; i < len; i++) {
            const appointment = result.rows.item(i);
            console.log(`Appointment ${i+1}: ${JSON.stringify(appointment)}`);
            appointments.push(appointment);
          }
          
          resolve(appointments);
        },
        (_, error) => {
          console.error(`Error getting appointments for hospital ID ${hospitalId}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Update appointment status
export const updateAppointmentStatus = (appointmentId, status) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!appointmentId) {
      reject(new Error("Appointment ID is required"));
      return;
    }
    
    if (!status || (status !== 'pending' && status !== 'completed')) {
      reject(new Error("Status must be either 'pending' or 'completed'"));
      return;
    }
    
    console.log(`Updating appointment ${appointmentId} status to ${status}`);
    
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE appointments SET status = ? WHERE id = ?`,
        [status, appointmentId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            console.log(`Successfully updated appointment ${appointmentId} status to ${status}`);
            resolve(true);
          } else {
            console.log(`No appointment found with ID ${appointmentId}`);
            resolve(false);
          }
        },
        (_, error) => {
          console.error(`Error updating appointment ${appointmentId} status:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Create a walk-in patient appointment directly at the hospital
export const createWalkInAppointment = (walkInData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!walkInData || !walkInData.hospitalId) {
      reject(new Error("Invalid walk-in appointment data: Hospital ID is required"));
      return;
    }
    
    if (!walkInData.patientName) {
      reject(new Error("Patient name is required"));
      return;
    }
    
    const createdAt = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Create temporary family member record for the walk-in patient
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO family_members (userId, name, relation, age, gender, medicalConditions, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          null, // No user ID for walk-in patients
          walkInData.patientName,
          'Walk-in Patient',
          walkInData.patientAge || null,
          walkInData.patientGender || 'unknown',
          walkInData.medicalConditions || '',
          createdAt
        ],
        (_, familyResult) => {
          const familyMemberId = familyResult.insertId;
          
          // Create appointment record
          tx.executeSql(
            `INSERT INTO appointments (userId, hospitalId, familyMemberId, vaccine, date, time, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              null, // No user ID for walk-in patients
              walkInData.hospitalId,
              familyMemberId,
              walkInData.vaccine || '',
              today,
              time,
              'pending',
              createdAt
            ],
            (_, appointmentResult) => {
              const appointmentId = appointmentResult.insertId;
              
              // Query to get the complete appointment data with patient info
              tx.executeSql(
                `SELECT a.*, f.name as familyMemberName, 
                        f.age as patientAge, f.gender as patientGender, 
                        f.medicalConditions as patientMedicalConditions
                 FROM appointments a
                 LEFT JOIN family_members f ON a.familyMemberId = f.id
                 WHERE a.id = ?`,
                [appointmentId],
                (_, result) => {
                  if (result.rows.length > 0) {
                    const appointment = result.rows.item(0);
                    appointment.walkIn = true; // Mark as walk-in appointment
                    resolve(appointment);
                  } else {
                    resolve({
                      id: appointmentId,
                      hospitalId: walkInData.hospitalId,
                      familyMemberId: familyMemberId,
                      familyMemberName: walkInData.patientName,
                      vaccine: walkInData.vaccine || '',
                      date: today,
                      time: time,
                      status: 'pending',
                      walkIn: true,
                      createdAt: createdAt
                    });
                  }
                },
                (_, error) => {
                  console.error("Error getting created walk-in appointment:", error);
                  
                  // Still resolve with basic data if query fails
                  resolve({
                    id: appointmentId,
                    hospitalId: walkInData.hospitalId,
                    familyMemberId: familyMemberId,
                    familyMemberName: walkInData.patientName,
                    vaccine: walkInData.vaccine || '',
                    date: today,
                    time: time,
                    status: 'pending',
                    walkIn: true,
                    createdAt: createdAt
                  });
                  
                  return false;
                }
              );
            },
            (_, error) => {
              console.error("Error creating walk-in appointment:", error);
              reject(error);
              return false;
            }
          );
        },
        (_, error) => {
          console.error("Error creating temporary family member for walk-in:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Close database connection
export const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close(
        () => {
          console.log("Database closed successfully");
          db = null;
          resolve();
        },
        error => {
          console.error("Error closing database:", error);
          db = null; // Still set to null to force a fresh connection next time
          reject(error);
        }
      );
    } else {
      resolve();
    }
  });
};

// Register a new user or hospital
export const registerUser = (userData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!userData || !userData.email || !userData.password) {
      reject(new Error("Invalid user data"));
      return;
    }
    
    const { name, email, password, userType, phone, address, location } = userData;
    const createdAt = new Date().toISOString();
    
    // First, check if email already exists in the appropriate table
    const checkEmailSql = userType === 'hospital' 
      ? "SELECT * FROM hospitals WHERE email = ?"
      : "SELECT * FROM users WHERE email = ?";
      
    db.transaction(tx => {
      tx.executeSql(
        checkEmailSql,
        [email],
        (_, result) => {
          if (result.rows.length > 0) {
            reject(new Error("Email already registered"));
            return;
          }
          
          // Create record in the appropriate table
          if (userType === 'hospital') {
            // Create hospital record directly in hospitals table
            console.log(`Creating hospital record for ${name}`);
            tx.executeSql(
              `INSERT INTO hospitals (name, email, password, location, type, vaccines, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                name || '',
                email,
                password,
                location || '',
                'Hospital',
                'All standard vaccines',
                createdAt
              ],
              (_, insertResult) => {
                const hospitalId = insertResult.insertId;
                console.log(`Hospital registered with ID: ${hospitalId}`);
                
                resolve({
                  id: hospitalId,
                  name,
                  email,
                  userType: 'hospital',
                  location,
                  createdAt
                });
              },
              (_, error) => {
                console.error("Error registering hospital:", error);
                reject(error);
                return false;
              }
            );
          } else {
            // Create regular user record in users table
            tx.executeSql(
              `INSERT INTO users (name, email, password, phone, address, createdAt)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                name || '',
                email,
                password,
                phone || '',
                address || '',
                createdAt
              ],
              (_, insertResult) => {
                const userId = insertResult.insertId;
                console.log(`User registered with ID: ${userId}`);
                
                resolve({
                  id: userId,
                  name,
                  email,
                  userType: 'user',
                  phone,
                  address,
                  createdAt
                });
              },
              (_, error) => {
                console.error("Error registering user:", error);
                reject(error);
                return false;
              }
            );
          }
        },
        (_, error) => {
          console.error("Error checking for existing email:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Delete all data from all tables but keep the structure
export const purgeAllData = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    console.log("Purging all data from database...");
    
    db.transaction(tx => {
      // Delete all data from all tables
      tx.executeSql("DELETE FROM users", [], 
        () => console.log("Purged users table"),
        (_, error) => console.error("Error purging users table:", error)
      );
      
      tx.executeSql("DELETE FROM hospitals", [], 
        () => console.log("Purged hospitals table"),
        (_, error) => console.error("Error purging hospitals table:", error)
      );
      
      tx.executeSql("DELETE FROM family_members", [], 
        () => console.log("Purged family_members table"),
        (_, error) => console.error("Error purging family_members table:", error)
      );
      
      tx.executeSql("DELETE FROM appointments", [], 
        () => console.log("Purged appointments table"),
        (_, error) => console.error("Error purging appointments table:", error)
      );
    }, 
    error => {
      console.error("Transaction error during purge:", error);
      reject(error);
    }, 
    () => {
      console.log("All data successfully purged");
      resolve(true);
    });
  });
};

// Add this function for testing - insert a test hospital with known location
export const insertTestHospitals = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    console.log("Inserting test hospitals for debugging...");
    
    const testHospitals = [
      {
        name: "Dhule Medical Center",
        email: "dhule.hospital@example.com",
        password: "password123",
        location: "Dhule",
        type: "General Hospital",
        vaccines: "COVID-19, Polio, Measles",
        createdAt: new Date().toISOString()
      },
      {
        name: "Nashik Health Center",
        email: "nashik.health@example.com",
        password: "password123",
        location: "Nashik",
        type: "Community Hospital",
        vaccines: "COVID-19, Flu, Hepatitis",
        createdAt: new Date().toISOString()
      }
    ];
    
    let inserted = 0;
    const errors = [];
    
    db.transaction(tx => {
      testHospitals.forEach(hospital => {
        tx.executeSql(
          `INSERT INTO hospitals (name, email, password, location, type, vaccines, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            hospital.name,
            hospital.email,
            hospital.password,
            hospital.location,
            hospital.type,
            hospital.vaccines,
            hospital.createdAt
          ],
          (_, result) => {
            inserted++;
            console.log(`Inserted test hospital: ${hospital.name} (${hospital.location}) with ID: ${result.insertId}`);
          },
          (_, error) => {
            console.error(`Error inserting test hospital ${hospital.name}:`, error);
            errors.push({hospital: hospital.name, error});
            return false;
          }
        );
      });
    }, 
    error => {
      console.error("Transaction error during test data insertion:", error);
      reject(error);
    }, 
    () => {
      console.log(`Successfully inserted ${inserted} test hospitals with errors: ${errors.length}`);
      if (errors.length) {
        console.log("Errors:", errors);
      }
      resolve(inserted);
    });
  });
};

// Function to migrate hospital data from users table to hospitals table
export const migrateHospitals = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    console.log("Starting migration of hospitals from users table to hospitals table...");
    
    // First get all candidate hospitals to migrate
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM users WHERE 
          name LIKE '%hospital%' OR 
          name LIKE '%care%' OR 
          name LIKE '%medical%' OR 
          name LIKE '%clinic%' OR
          name LIKE '%centre%' OR
          name LIKE '%center%'`,
        [],
        (_, result) => {
          const hospitals = [];
          for (let i = 0; i < result.rows.length; i++) {
            hospitals.push(result.rows.item(i));
          }
          
          console.log(`Found ${hospitals.length} potential hospitals to migrate`);
          
          if (hospitals.length === 0) {
            resolve(0);
            return;
          }
          
          // Now migrate each hospital one by one in separate transactions
          processMigrations(hospitals, 0, 0)
            .then(migrated => resolve(migrated))
            .catch(err => reject(err));
        },
        (_, error) => {
          console.error("Error finding hospitals to migrate:", error);
          reject(error);
          return false;
        }
      );
    });
    
    // Process migrations one by one in separate transactions
    function processMigrations(hospitals, index, migrated) {
      return new Promise((resolve, reject) => {
        if (index >= hospitals.length) {
          console.log(`Migration complete. ${migrated} hospitals migrated successfully.`);
          resolve(migrated);
          return;
        }
        
        const hospital = hospitals[index];
        console.log(`Processing hospital ${index + 1}/${hospitals.length}: ${hospital.name}`);
        
        // Check if hospital already exists in hospitals table
        checkExistingHospital(hospital)
          .then(exists => {
            if (exists) {
              console.log(`Hospital with email ${hospital.email} already exists - skipping`);
              return deleteFromUsersTable(hospital.id).then(() => {
                return processMigrations(hospitals, index + 1, migrated + 1);
              });
            } else {
              // Migrate this hospital
              return migrateOneHospital(hospital)
                .then(() => {
                  console.log(`Successfully migrated hospital: ${hospital.name}`);
                  return processMigrations(hospitals, index + 1, migrated + 1);
                })
                .catch(err => {
                  console.error(`Error migrating hospital ${hospital.name}:`, err);
                  console.log(`Continuing with next hospital...`);
                  return processMigrations(hospitals, index + 1, migrated);
                });
            }
          })
          .then(result => resolve(result))
          .catch(err => {
            console.error(`Error in migration process:`, err);
            // Continue with next hospital despite errors
            processMigrations(hospitals, index + 1, migrated)
              .then(result => resolve(result))
              .catch(err => reject(err));
          });
      });
    }
    
    // Check if hospital already exists in hospitals table
    function checkExistingHospital(hospital) {
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            "SELECT * FROM hospitals WHERE email = ?",
            [hospital.email || ''],
            (_, result) => {
              resolve(result.rows.length > 0);
            },
            (_, error) => {
              console.error(`Error checking for existing hospital:`, error);
              reject(error);
              return false;
            }
          );
        });
      });
    }
    
    // Delete a hospital from users table
    function deleteFromUsersTable(userId) {
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            "DELETE FROM users WHERE id = ?",
            [userId],
            (_, result) => {
              console.log(`Deleted user with ID ${userId} from users table`);
              resolve(result.rowsAffected);
            },
            (_, error) => {
              console.error(`Error deleting user with ID ${userId}:`, error);
              reject(error);
              return false;
            }
          );
        });
      });
    }
    
    // Migrate a single hospital
    function migrateOneHospital(hospital) {
      return new Promise((resolve, reject) => {
        // Use the address field as location if available
        const location = hospital.address || '';
        
        // Make sure email is unique
        const email = hospital.email || `hospital_${hospital.id}_${Date.now()}@migrated.com`;
        
        // Prepare hospital data
        const name = hospital.name || 'Unknown Hospital';
        const password = hospital.password || '';
        const createdAt = hospital.createdAt || new Date().toISOString();
        
        console.log(`Migrating hospital: ${name}, with location: ${location}, email: ${email}`);
        
        // First insert into hospitals table
        db.transaction(tx => {
          tx.executeSql(
            `INSERT INTO hospitals (name, email, password, location, type, vaccines, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              name,
              email,
              password,
              location,
              'Hospital',
              'All standard vaccines',
              createdAt
            ],
            (_, insertResult) => {
              const newId = insertResult.insertId;
              console.log(`Hospital inserted into hospitals table with ID: ${newId}`);
              
              // Now delete from users table
              deleteFromUsersTable(hospital.id)
                .then(() => {
                  console.log(`Migration of ${name} completed successfully`);
                  resolve(true);
                })
                .catch(err => {
                  console.error(`Failed to delete ${name} from users table:`, err);
                  // Even if deletion fails, consider migration successful
                  // since we got the record into the hospitals table
                  resolve(true);
                });
            },
            (_, error) => {
              console.error(`Failed to insert ${name} into hospitals table:`, error);
              if (error) {
                console.error(`SQL Error: ${error.message || 'Unknown error'}`);
              } else {
                console.error(`Unknown error occurred - error object is undefined`);
              }
              reject(error || new Error('Unknown SQL error'));
              return false;
            }
          );
        }, error => {
          console.error(`Transaction error:`, error);
          reject(error);
        });
      });
    }
  });
};

// Function to recreate the hospitals table
export const recreateHospitalsTable = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    console.log("Recreating hospitals table with current schema...");
    
    db.transaction(tx => {
      // First drop the table if it exists
      tx.executeSql(
        "DROP TABLE IF EXISTS hospitals",
        [],
        () => {
          console.log("Hospitals table dropped");
          
          // Now recreate it with the correct schema
          tx.executeSql(
            `CREATE TABLE hospitals (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT,
              email TEXT UNIQUE,
              password TEXT,
              location TEXT,
              type TEXT,
              vaccines TEXT,
              createdAt TEXT
            )`,
            [],
            () => {
              console.log("Hospitals table recreated with password column");
              resolve(true);
            },
            (_, error) => {
              console.error("Error recreating hospitals table:", error);
              reject(error);
              return false;
            }
          );
        },
        (_, error) => {
          console.error("Error dropping hospitals table:", error);
          reject(error);
          return false;
        }
      );
    }, error => {
      console.error("Transaction error in recreateHospitalsTable:", error);
      reject(error);
    });
  });
};

// Add vaccine to inventory
export const addVaccineToInventory = (hospitalId, vaccineData) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!hospitalId || !vaccineData.vaccineName) {
      reject(new Error("Hospital ID and vaccine name are required"));
      return;
    }
    
    const updatedAt = new Date().toISOString();
    
    // Check if this vaccine already exists for this hospital
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM vaccine_inventory WHERE hospitalId = ? AND vaccineName = ?",
        [hospitalId, vaccineData.vaccineName],
        (_, result) => {
          if (result.rows.length > 0) {
            // Update existing record
            const existingVaccine = result.rows.item(0);
            
            tx.executeSql(
              `UPDATE vaccine_inventory 
              SET quantity = ?, minAge = ?, maxAge = ?, description = ?, updatedAt = ?
              WHERE id = ?`,
              [
                vaccineData.quantity || existingVaccine.quantity,
                vaccineData.minAge !== undefined ? vaccineData.minAge : existingVaccine.minAge,
                vaccineData.maxAge !== undefined ? vaccineData.maxAge : existingVaccine.maxAge,
                vaccineData.description || existingVaccine.description,
                updatedAt,
                existingVaccine.id
              ],
              (_, updateResult) => {
                console.log(`Updated vaccine ${vaccineData.vaccineName} inventory for hospital ${hospitalId}`);
                resolve({
                  id: existingVaccine.id,
                  hospitalId,
                  ...vaccineData,
                  updatedAt
                });
              },
              (_, error) => {
                console.error("Error updating vaccine inventory:", error);
                reject(error);
                return false;
              }
            );
          } else {
            // Insert new record
            tx.executeSql(
              `INSERT INTO vaccine_inventory 
              (hospitalId, vaccineName, quantity, minAge, maxAge, description, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                hospitalId,
                vaccineData.vaccineName,
                vaccineData.quantity || 0,
                vaccineData.minAge || 0,
                vaccineData.maxAge || 100,
                vaccineData.description || '',
                updatedAt
              ],
              (_, insertResult) => {
                const id = insertResult.insertId;
                console.log(`Added vaccine ${vaccineData.vaccineName} to inventory for hospital ${hospitalId}`);
                resolve({
                  id,
                  hospitalId,
                  ...vaccineData,
                  updatedAt
                });
              },
              (_, error) => {
                console.error("Error adding vaccine to inventory:", error);
                reject(error);
                return false;
              }
            );
          }
        },
        (_, error) => {
          console.error("Error checking existing vaccine inventory:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get vaccine inventory for a hospital
export const getHospitalVaccineInventory = (hospitalId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!hospitalId) {
      reject(new Error("Hospital ID is required"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM vaccine_inventory WHERE hospitalId = ? ORDER BY vaccineName",
        [hospitalId],
        (_, result) => {
          const inventory = [];
          const len = result.rows.length;
          
          for (let i = 0; i < len; i++) {
            inventory.push(result.rows.item(i));
          }
          
          console.log(`Found ${inventory.length} vaccines in inventory for hospital ${hospitalId}`);
          resolve(inventory);
        },
        (_, error) => {
          console.error("Error getting hospital vaccine inventory:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Remove vaccine from inventory
export const removeVaccineFromInventory = (inventoryId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!inventoryId) {
      reject(new Error("Inventory ID is required"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "DELETE FROM vaccine_inventory WHERE id = ?",
        [inventoryId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            console.log(`Removed vaccine inventory item ${inventoryId}`);
            resolve(true);
          } else {
            console.log(`No vaccine inventory found with ID ${inventoryId}`);
            resolve(false);
          }
        },
        (_, error) => {
          console.error("Error removing vaccine from inventory:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get available vaccines by hospital and age
export const getAvailableVaccines = (hospitalId, age) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!hospitalId) {
      reject(new Error("Hospital ID is required"));
      return;
    }
    
    // If age is null or undefined, get all vaccines for the hospital without age filtering
    if (age === null || age === undefined) {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM vaccine_inventory 
           WHERE hospitalId = ? 
           AND quantity > 0
           ORDER BY vaccineName`,
          [hospitalId],
          (_, result) => {
            const vaccines = [];
            const len = result.rows.length;
            
            for (let i = 0; i < len; i++) {
              vaccines.push(result.rows.item(i));
            }
            
            console.log(`Found ${vaccines.length} available vaccines at hospital ${hospitalId} (all ages)`);
            resolve(vaccines);
          },
          (_, error) => {
            console.error("Error getting available vaccines:", error);
            reject(error);
            return false;
          }
        );
      });
    } else {
      // If age is provided, filter by age
      const patientAge = age || 0; // Default to 0 if not provided but not null
      
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM vaccine_inventory 
           WHERE hospitalId = ? 
           AND quantity > 0
           AND minAge <= ?
           AND maxAge >= ?
           ORDER BY vaccineName`,
          [hospitalId, patientAge, patientAge],
          (_, result) => {
            const vaccines = [];
            const len = result.rows.length;
            
            for (let i = 0; i < len; i++) {
              vaccines.push(result.rows.item(i));
            }
            
            console.log(`Found ${vaccines.length} available vaccines for age ${patientAge} at hospital ${hospitalId}`);
            resolve(vaccines);
          },
          (_, error) => {
            console.error("Error getting available vaccines:", error);
            reject(error);
            return false;
          }
        );
      });
    }
  });
};

// Cancel appointment
export const cancelAppointment = (appointmentId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!appointmentId) {
      reject(new Error("Appointment ID is required"));
      return;
    }
    
    console.log(`Canceling appointment with ID: ${appointmentId}`);
    
    db.transaction(tx => {
      tx.executeSql(
        `DELETE FROM appointments WHERE id = ?`,
        [appointmentId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            console.log(`Successfully canceled appointment ${appointmentId}`);
            resolve(true);
          } else {
            console.log(`No appointment found with ID ${appointmentId}`);
            resolve(false);
          }
        },
        (_, error) => {
          console.error(`Error canceling appointment ${appointmentId}:`, error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Add report
export const addReport = (report) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    if (!report || !report.patientId) {
      reject(new Error("Invalid report data"));
      return;
    }
    
    const createdAt = report.createdAt || new Date().toISOString();
    const reportData = typeof report.reportData === 'object' 
      ? JSON.stringify(report.reportData) 
      : report.reportData || '';
    
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO reports (
          patientId, 
          patientName, 
          description, 
          reportData, 
          createdBy, 
          createdByType, 
          imageData, 
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          report.patientId,
          report.patientName || '',
          report.description || '',
          reportData,
          report.createdBy || 0,
          report.createdByType || 'hospital',
          report.imageData || null,
          createdAt
        ],
        (_, result) => {
          const id = result.insertId;
          resolve({ id, ...report, createdAt });
        },
        (_, error) => {
          console.error("Error adding report:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get reports by patient ID
export const getReportsByPatientId = (patientId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM reports WHERE patientId = ? ORDER BY createdAt DESC",
        [patientId],
        (_, result) => {
          const reports = [];
          const len = result.rows.length;
          
          for (let i = 0; i < len; i++) {
            const report = result.rows.item(i);
            
            // Parse reportData if it's JSON
            if (report.reportData) {
              try {
                report.reportData = JSON.parse(report.reportData);
              } catch (e) {
                // If it's not valid JSON, keep as is
              }
            }
            
            reports.push(report);
          }
          
          resolve(reports);
        },
        (_, error) => {
          console.error("Error getting reports:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get reports by creator (hospital or user)
export const getReportsByCreator = (creatorId, creatorType = 'hospital') => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM reports WHERE createdBy = ? AND createdByType = ? ORDER BY createdAt DESC",
        [creatorId, creatorType],
        (_, result) => {
          const reports = [];
          const len = result.rows.length;
          
          for (let i = 0; i < len; i++) {
            const report = result.rows.item(i);
            
            // Parse reportData if it's JSON
            if (report.reportData) {
              try {
                report.reportData = JSON.parse(report.reportData);
              } catch (e) {
                // If it's not valid JSON, keep as is
              }
            }
            
            reports.push(report);
          }
          
          resolve(reports);
        },
        (_, error) => {
          console.error("Error getting reports:", error);
          reject(error);
          return false;
        }
      );
    });
  });
};

// Delete report
export const deleteReport = (reportId) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    db.transaction(tx => {
      tx.executeSql(
        "DELETE FROM reports WHERE id = ?",
        [reportId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            resolve(true);
          } else {
            reject(new Error("Report not found"));
          }
        },
        (_, error) => {
          console.error("Error deleting report:", error);
          reject(error);
          return false;
        }
      );
    });
  });
}; 