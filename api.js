/***************************************
 * API Configuration
 ***************************************/
const API_BASE_URL = 'http://localhost:8080/api';
// Example:
// const API_BASE_URL = 'http://132.145.78.23:8080/api';
// const API_BASE_URL = 'https://abc123.ngrok.io/api';

/***************************************
 * API Helper Function
 ***************************************/
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

/***************************************
 * Global State
 ***************************************/
let students = [];
let halls = [];
let seatingArrangement = null;
let currentViolationStudent = null;

/***************************************
 * Violation Types
 ***************************************/
const violationTypes = {
    'Peeking': -5,
    'Communication': -10,
    'Copying': -15,
    'Unauthorized Material': -20
};

/***************************************
 * Page Load
 ***************************************/
document.addEventListener('DOMContentLoaded', () => {
    initializeForms();
    loadDataFromServer();
});

/***************************************
 * Load Data
 ***************************************/
async function loadDataFromServer() {
    const studentsResult = await apiCall('/students');
    if (studentsResult.success) {
        students = studentsResult.students;
        updateDashboard();
        updateStudentsTable();
    }

    const hallsResult = await apiCall('/halls');
    if (hallsResult.success) {
        halls = hallsResult.halls;
        updateDashboard();
        updateHallsList();
    }
}

/***************************************
 * Forms
 ***************************************/
function initializeForms() {
    document.getElementById('studentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addStudent();
    });

    document.getElementById('hallForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addHall();
    });
}

/***************************************
 * Tab Switching
 ***************************************/
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

/***************************************
 * Add Student
 ***************************************/
async function addStudent() {
    const name = studentName.value;
    const rollNo = rollNoInput.value || rollNo.value;
    const subject = subject.value;

    if (!name || !rollNo || !subject) {
        alert('Fill all fields');
        return;
    }

    const result = await apiCall('/students', 'POST', { name, rollNo, subject });

    if (result.success) {
        studentForm.reset();
        await loadDataFromServer();
        alert('Student added successfully');
    } else {
        alert(result.error);
    }
}

/***************************************
 * Add Hall
 ***************************************/
async function addHall() {
    const name = hallName.value;
    const rows = parseInt(hallRows.value);
    const cols = parseInt(hallCols.value);

    if (!name || rows < 3 || cols < 3) {
        alert('Invalid hall data');
        return;
    }

    const result = await apiCall('/halls', 'POST', { name, rows, cols });

    if (result.success) {
        hallForm.reset();
        await loadDataFromServer();
        alert('Hall added successfully');
    } else {
        alert(result.error);
    }
}

/***************************************
 * Dashboard
 ***************************************/
function updateDashboard() {
    totalStudents.textContent = students.length;
    lowRisk.textContent = students.filter(s => s.risk === 'low').length;
    mediumRisk.textContent = students.filter(s => s.risk === 'medium').length;
    highRisk.textContent = students.filter(s => s.risk === 'high' || s.credibility === 0).length;
    hallCount.textContent = halls.length;
}

/***************************************
 * Students Table
 ***************************************/
function updateStudentsTable() {
    const tbody = studentsTableBody;
    tbody.innerHTML = '';

    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">No students added</td></tr>`;
        return;
    }

    students.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${s.rollNo}</td>
            <td>${s.name}</td>
            <td>${s.subject}</td>
            <td>${s.credibility}/100</td>
            <td><span class="risk-badge risk-${s.risk}">${s.risk.toUpperCase()}</span></td>
            <td><button class="btn btn-violation" onclick="openViolationModal(${s.id})">Add Violation</button></td>
        `;
        tbody.appendChild(row);
    });
}

/***************************************
 * Halls
 ***************************************/
function updateHallsList() {
    hallsList.innerHTML = '';

    if (halls.length === 0) {
        hallsList.innerHTML = '<p class="no-data">No halls added</p>';
        return;
    }

    halls.forEach(h => {
        hallsList.innerHTML += `
            <div class="hall-card">
                <h3>${h.name}</h3>
                <p>Rows: ${h.rows} | Cols: ${h.cols}</p>
                <p>Capacity: ${h.capacity}</p>
            </div>
        `;
    });
}

/***************************************
 * Violations
 ***************************************/
function openViolationModal(id) {
    currentViolationStudent = students.find(s => s.id === id);
    violationModal.style.display = 'block';
}

function closeViolationModal() {
    violationModal.style.display = 'none';
    currentViolationStudent = null;
}

async function submitViolation() {
    const type = violationType.value;
    if (!type || !currentViolationStudent) return;

    const result = await apiCall('/violations', 'POST', {
        studentId: currentViolationStudent.id,
        points: violationTypes[type]
    });

    if (result.success) {
        closeViolationModal();
        await loadDataFromServer();
        alert('Violation recorded');
    }
}

/***************************************
 * Seating Generation
 ***************************************/
async function generateSeating() {
    const result = await apiCall('/generate', 'POST');
    if (result.success) {
        seatingArrangement = result.arrangement;
        displaySeating();
        switchTab('seating');
    } else {
        alert(result.error);
    }
}
