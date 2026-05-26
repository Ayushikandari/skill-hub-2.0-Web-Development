const bcrypt = require("bcryptjs");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

function dateKey(offsetDays = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE
  }).format(now);
}

async function createSeedDatabase() {
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
  const studentPasswordHash = await bcrypt.hash("student123", 10);

  const teacherId = "user_teacher_demo";
  const studentId = "user_student_demo";

  const subjects = [
    {
      id: "eng-math",
      code: "MATH201",
      name: "Engineering Mathematics",
      branch: "Common Engineering Core",
      accent: "#0ea5e9",
      difficulty: "Core",
      recommendedHours: 6,
      description: "Transforms, differential equations, and matrices for engineering problem solving.",
      topics: [
        "Laplace Transform",
        "Fourier Series",
        "Numerical Methods",
        "Partial Differential Equations"
      ]
    },
    {
      id: "dsa",
      code: "CS202",
      name: "Data Structures and Algorithms",
      branch: "Computer Science",
      accent: "#f59e0b",
      difficulty: "High",
      recommendedHours: 7,
      description: "Core problem-solving subject covering data structures, recursion, and algorithmic thinking.",
      topics: [
        "Arrays and Strings",
        "Linked Lists",
        "Trees and Traversals",
        "Dynamic Programming",
        "Graphs"
      ]
    },
    {
      id: "dbms",
      code: "CS303",
      name: "Database Management Systems",
      branch: "Computer Science",
      accent: "#10b981",
      difficulty: "Medium",
      recommendedHours: 5,
      description: "Relational modeling, SQL, normalization, and transaction management.",
      topics: [
        "ER Modeling",
        "Normalization",
        "SQL Queries",
        "Transactions and Concurrency"
      ]
    },
    {
      id: "os",
      code: "CS304",
      name: "Operating Systems",
      branch: "Computer Science",
      accent: "#f97316",
      difficulty: "High",
      recommendedHours: 6,
      description: "Processes, scheduling, memory management, synchronization, and file systems.",
      topics: [
        "Process Scheduling",
        "CPU Scheduling Algorithms",
        "Deadlocks",
        "Memory Management",
        "Synchronization"
      ]
    },
    {
      id: "cn",
      code: "CS305",
      name: "Computer Networks",
      branch: "Computer Science",
      accent: "#8b5cf6",
      difficulty: "Medium",
      recommendedHours: 5,
      description: "Network layers, protocols, routing, transport reliability, and congestion control.",
      topics: [
        "OSI Model",
        "TCP vs UDP",
        "Routing",
        "Network Security"
      ]
    },
    {
      id: "digital-logic",
      code: "EC201",
      name: "Digital Logic Design",
      branch: "Electronics",
      accent: "#ef4444",
      difficulty: "Medium",
      recommendedHours: 5,
      description: "Boolean algebra, combinational circuits, sequential circuits, and logic optimization.",
      topics: [
        "Boolean Algebra",
        "Karnaugh Maps",
        "Flip-Flops",
        "Finite State Machines"
      ]
    }
  ];

  const notes = [
    {
      id: "note_math_laplace",
      subjectId: "eng-math",
      title: "Laplace Transform Cheat Sheet",
      topic: "Laplace Transform",
      tags: ["transforms", "revision", "problem-solving"],
      difficulty: "Medium",
      authorId: teacherId,
      createdAt: `${dateKey(-8)}T09:00:00.000Z`,
      content:
        "The Laplace transform converts a time-domain function into an s-domain representation. It is useful for solving differential equations because differentiation in time becomes multiplication by s in the transform domain. Always begin with the definition, check the region of convergence when needed, and memorize standard transforms for 1, t, e^(at), sin(at), and cos(at). In circuit and control applications, Laplace transforms simplify initial condition handling and make transfer function analysis easier. Practice inverse Laplace using partial fractions because it appears frequently in examinations."
    },
    {
      id: "note_math_numerical",
      subjectId: "eng-math",
      title: "Numerical Methods for Fast Approximation",
      topic: "Numerical Methods",
      tags: ["newton-raphson", "gauss-seidel", "iterative"],
      difficulty: "Medium",
      authorId: teacherId,
      createdAt: `${dateKey(-5)}T11:15:00.000Z`,
      content:
        "Numerical methods provide approximate solutions when exact analytical solutions are difficult. Newton-Raphson is preferred for fast root finding when a good starting point exists. The key exam habit is to show the iteration formula clearly, substitute values step by step, and stop once the required accuracy is reached. For linear systems, Jacobi and Gauss-Seidel are iterative methods. Convergence depends on matrix properties such as diagonal dominance."
    },
    {
      id: "note_dsa_dp",
      subjectId: "dsa",
      title: "Dynamic Programming Pattern Map",
      topic: "Dynamic Programming",
      tags: ["dp", "memoization", "tabulation"],
      difficulty: "High",
      authorId: teacherId,
      createdAt: `${dateKey(-7)}T08:45:00.000Z`,
      content:
        "Dynamic programming is used when a problem has overlapping subproblems and optimal substructure. Start by defining the state precisely. Then write a recurrence, decide memoization or tabulation, initialize base cases, and reason about the transition order. Common patterns include 0/1 knapsack, longest common subsequence, matrix chain multiplication, and one-dimensional take-or-skip decisions. Students often lose marks by writing a recurrence without explaining what dp[i] or dp[i][j] means, so state interpretation matters."
    },
    {
      id: "note_dsa_graphs",
      subjectId: "dsa",
      title: "Graph Traversal Quick Notes",
      topic: "Graphs",
      tags: ["bfs", "dfs", "shortest path"],
      difficulty: "Medium",
      authorId: teacherId,
      createdAt: `${dateKey(-4)}T13:10:00.000Z`,
      content:
        "Graphs model relationships between entities. Breadth-first search explores level by level and is useful for shortest path in unweighted graphs. Depth-first search is powerful for cycle detection, topological sorting, and connected components. When solving problems, identify whether the graph is directed, weighted, cyclic, or disconnected before choosing an algorithm. For shortest path, Dijkstra is suitable when weights are non-negative."
    },
    {
      id: "note_dbms_norm",
      subjectId: "dbms",
      title: "Normalization Without Confusion",
      topic: "Normalization",
      tags: ["1NF", "2NF", "3NF", "bcnf"],
      difficulty: "Medium",
      authorId: teacherId,
      createdAt: `${dateKey(-6)}T10:30:00.000Z`,
      content:
        "Normalization reduces redundancy and update anomalies. First normal form removes repeating groups. Second normal form eliminates partial dependency on a composite key. Third normal form removes transitive dependency. BCNF is stronger and requires every determinant to be a candidate key. In exams, write the dependencies clearly, identify keys, and show decomposition step by step. Normalization improves consistency but may introduce joins, so design decisions should balance performance and integrity."
    },
    {
      id: "note_dbms_txn",
      subjectId: "dbms",
      title: "Transactions and Concurrency Control",
      topic: "Transactions and Concurrency",
      tags: ["acid", "serializability", "locking"],
      difficulty: "High",
      authorId: teacherId,
      createdAt: `${dateKey(-3)}T14:20:00.000Z`,
      content:
        "A transaction is a logical unit of work that must satisfy ACID properties. Atomicity ensures all or nothing execution. Consistency preserves database rules. Isolation prevents concurrent transactions from corrupting results. Durability guarantees committed changes survive failures. Locking and timestamp techniques are used to enforce concurrency control. Two-phase locking is common, but it can cause deadlocks if not handled carefully."
    },
    {
      id: "note_os_sched",
      subjectId: "os",
      title: "CPU Scheduling Master Sheet",
      topic: "CPU Scheduling Algorithms",
      tags: ["fcfs", "sjf", "round robin", "priority"],
      difficulty: "Medium",
      authorId: teacherId,
      createdAt: `${dateKey(-7)}T12:00:00.000Z`,
      content:
        "CPU scheduling decides which process gets the processor next. FCFS is simple but can suffer from convoy effect. SJF minimizes average waiting time when burst length is known. Round Robin is suitable for time-sharing systems because it provides fairness using a time quantum. Priority scheduling can lead to starvation unless aging is applied. In numerical problems, draw the Gantt chart first, then compute completion time, turnaround time, and waiting time carefully."
    },
    {
      id: "note_os_sync",
      subjectId: "os",
      title: "Synchronization and Critical Section",
      topic: "Synchronization",
      tags: ["semaphore", "mutex", "deadlock"],
      difficulty: "High",
      authorId: teacherId,
      createdAt: `${dateKey(-2)}T15:45:00.000Z`,
      content:
        "Synchronization ensures safe access to shared resources. A critical section is a code segment where shared data is accessed. Mutual exclusion prevents race conditions. Mutexes, semaphores, and monitors are standard tools. Classical problems such as producer-consumer, readers-writers, and dining philosophers test understanding of coordination. When writing answers, explain why the chosen mechanism avoids race conditions and whether deadlock or starvation is still possible."
    },
    {
      id: "note_cn_tcp",
      subjectId: "cn",
      title: "TCP vs UDP in Real Systems",
      topic: "TCP vs UDP",
      tags: ["transport", "reliability", "latency"],
      difficulty: "Easy",
      authorId: teacherId,
      createdAt: `${dateKey(-4)}T09:30:00.000Z`,
      content:
        "TCP is connection-oriented and reliable. It provides sequencing, acknowledgements, flow control, and congestion control. UDP is connectionless and lightweight, making it suitable for low-latency communication like streaming, DNS, and gaming when the application can tolerate loss. In interviews and exams, compare them using reliability, speed, header size, ordering, and use cases rather than saying only that TCP is slow and UDP is fast."
    },
    {
      id: "note_cn_osi",
      subjectId: "cn",
      title: "OSI Model Memory Guide",
      topic: "OSI Model",
      tags: ["layers", "protocols", "encapsulation"],
      difficulty: "Easy",
      authorId: teacherId,
      createdAt: `${dateKey(-1)}T16:00:00.000Z`,
      content:
        "The OSI model divides communication into seven layers: physical, data link, network, transport, session, presentation, and application. Each layer has a specific role and communicates with the adjacent layer through services and interfaces. Encapsulation happens as data moves down the stack and decapsulation happens on the receiving side. Remember the model not just as a sequence but as a debugging tool for identifying where a failure occurs."
    },
    {
      id: "note_dl_kmap",
      subjectId: "digital-logic",
      title: "Karnaugh Map Simplification Flow",
      topic: "Karnaugh Maps",
      tags: ["logic minimization", "boolean"],
      difficulty: "Medium",
      authorId: teacherId,
      createdAt: `${dateKey(-5)}T08:10:00.000Z`,
      content:
        "Karnaugh maps simplify Boolean expressions by grouping adjacent ones or zeros in powers of two. The aim is to obtain a minimal SOP or POS expression. Always mark the variables in Gray code order, form the largest possible groups, and use don't care conditions when they help. K-maps are easy for small variable counts and are widely used for exam problems and logic circuit design."
    }
  ];

  const quizzes = [
    {
      id: "quiz_dsa_dp",
      subjectId: "dsa",
      topic: "Dynamic Programming",
      title: "DP Foundations Quiz",
      createdBy: teacherId,
      createdAt: `${dateKey(-5)}T12:40:00.000Z`,
      questions: [
        {
          id: "q1",
          prompt: "Which condition is required before applying dynamic programming effectively?",
          options: [
            "Overlapping subproblems and optimal substructure",
            "Only recursive input format",
            "A sorted array",
            "A binary tree representation"
          ],
          answerIndex: 0,
          explanation: "Dynamic programming works when smaller subproblems repeat and optimal solutions can be built from them."
        },
        {
          id: "q2",
          prompt: "Memoization is best described as:",
          options: [
            "Bottom-up table filling",
            "Greedy local selection",
            "Top-down recursion with caching",
            "Bit manipulation"
          ],
          answerIndex: 2,
          explanation: "Memoization stores recursive results so repeated subproblems are not recomputed."
        },
        {
          id: "q3",
          prompt: "In a DP solution, the statement dp[i][j] should primarily define:",
          options: [
            "Compiler optimization",
            "The meaning of the state",
            "The input size only",
            "Memory address layout"
          ],
          answerIndex: 1,
          explanation: "A correct DP solution begins with a clear state meaning."
        }
      ]
    },
    {
      id: "quiz_dbms_norm",
      subjectId: "dbms",
      topic: "Normalization",
      title: "Normalization Rapid Test",
      createdBy: teacherId,
      createdAt: `${dateKey(-4)}T10:40:00.000Z`,
      questions: [
        {
          id: "q1",
          prompt: "Third normal form mainly removes:",
          options: [
            "Repeating groups",
            "Partial dependency",
            "Transitive dependency",
            "Primary keys"
          ],
          answerIndex: 2,
          explanation: "3NF removes transitive dependencies from non-key attributes."
        },
        {
          id: "q2",
          prompt: "Which normal form requires every determinant to be a candidate key?",
          options: ["1NF", "2NF", "BCNF", "4NF"],
          answerIndex: 2,
          explanation: "BCNF is stricter than 3NF and places the determinant rule."
        },
        {
          id: "q3",
          prompt: "Normalization primarily aims to:",
          options: [
            "Increase redundancy",
            "Reduce anomalies and redundancy",
            "Replace SQL",
            "Remove all joins"
          ],
          answerIndex: 1,
          explanation: "The purpose is cleaner design with fewer anomalies."
        }
      ]
    },
    {
      id: "quiz_os_sched",
      subjectId: "os",
      topic: "CPU Scheduling Algorithms",
      title: "Scheduling Concepts Check",
      createdBy: teacherId,
      createdAt: `${dateKey(-3)}T11:50:00.000Z`,
      questions: [
        {
          id: "q1",
          prompt: "Which algorithm is especially suitable for time-sharing systems?",
          options: ["SJF", "Round Robin", "FCFS", "Non-preemptive Priority"],
          answerIndex: 1,
          explanation: "Round Robin gives each process a time quantum and improves fairness."
        },
        {
          id: "q2",
          prompt: "The convoy effect is commonly associated with:",
          options: ["Round Robin", "SJF", "FCFS", "Priority Scheduling"],
          answerIndex: 2,
          explanation: "In FCFS, long jobs can delay shorter ones behind them."
        },
        {
          id: "q3",
          prompt: "Aging is a technique used to reduce:",
          options: ["Starvation", "Segmentation", "Thrashing", "Fragmentation"],
          answerIndex: 0,
          explanation: "Aging gradually improves the priority of waiting processes."
        }
      ]
    },
    {
      id: "quiz_cn_transport",
      subjectId: "cn",
      topic: "TCP vs UDP",
      title: "Transport Layer Warmup",
      createdBy: teacherId,
      createdAt: `${dateKey(-2)}T12:30:00.000Z`,
      questions: [
        {
          id: "q1",
          prompt: "Which protocol provides built-in reliability and ordered delivery?",
          options: ["IP", "UDP", "TCP", "ARP"],
          answerIndex: 2,
          explanation: "TCP manages sequencing and acknowledgements."
        },
        {
          id: "q2",
          prompt: "Which protocol is commonly chosen for low-latency applications that can tolerate some packet loss?",
          options: ["TCP", "UDP", "SMTP", "HTTP"],
          answerIndex: 1,
          explanation: "UDP has lower overhead and suits real-time workloads."
        },
        {
          id: "q3",
          prompt: "Congestion control is a standard built-in feature of:",
          options: ["UDP", "TCP", "ICMP", "DNS"],
          answerIndex: 1,
          explanation: "TCP includes flow and congestion control mechanisms."
        }
      ]
    }
  ];

  const studySessions = [
    {
      id: "session_1",
      userId: studentId,
      subjectId: "dsa",
      topic: "Dynamic Programming",
      startedAt: `${dateKey(-3)}T14:00:00.000Z`,
      endedAt: `${dateKey(-3)}T15:15:00.000Z`,
      durationMinutes: 75,
      date: dateKey(-3),
      status: "completed"
    },
    {
      id: "session_2",
      userId: studentId,
      subjectId: "os",
      topic: "CPU Scheduling Algorithms",
      startedAt: `${dateKey(-2)}T09:30:00.000Z`,
      endedAt: `${dateKey(-2)}T10:20:00.000Z`,
      durationMinutes: 50,
      date: dateKey(-2),
      status: "completed"
    },
    {
      id: "session_3",
      userId: studentId,
      subjectId: "dbms",
      topic: "Normalization",
      startedAt: `${dateKey(-1)}T18:00:00.000Z`,
      endedAt: `${dateKey(-1)}T18:45:00.000Z`,
      durationMinutes: 45,
      date: dateKey(-1),
      status: "completed"
    },
    {
      id: "session_4",
      userId: studentId,
      subjectId: "cn",
      topic: "OSI Model",
      startedAt: `${dateKey(0)}T07:00:00.000Z`,
      endedAt: `${dateKey(0)}T07:35:00.000Z`,
      durationMinutes: 35,
      date: dateKey(0),
      status: "completed"
    }
  ];

  const quizAttempts = [
    {
      id: "attempt_1",
      quizId: "quiz_dsa_dp",
      userId: studentId,
      score: 67,
      subjectId: "dsa",
      date: dateKey(-2),
      answers: [0, 2, 0]
    },
    {
      id: "attempt_2",
      quizId: "quiz_dbms_norm",
      userId: studentId,
      score: 100,
      subjectId: "dbms",
      date: dateKey(-1),
      answers: [2, 2, 1]
    }
  ];

  return {
    meta: {
      platformName: "SkillHub Engineering",
      createdAt: new Date().toISOString(),
      timezone: APP_TIMEZONE
    },
    users: [
      {
        id: teacherId,
        name: "Dr. Nisha Rao",
        email: "teacher@skillhub.dev",
        role: "teacher",
        passwordHash: teacherPasswordHash,
        branch: "Computer Science",
        createdAt: new Date().toISOString()
      },
      {
        id: studentId,
        name: "Aarav Mehta",
        email: "student@skillhub.dev",
        role: "student",
        passwordHash: studentPasswordHash,
        branch: "Computer Science",
        createdAt: new Date().toISOString()
      }
    ],
    subjects,
    notes,
    quizzes,
    studySessions,
    quizAttempts
  };
}

module.exports = {
  APP_TIMEZONE,
  createSeedDatabase,
  dateKey
};
