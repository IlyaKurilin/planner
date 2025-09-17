// Глобальные переменные
let tasks = [];
let currentTimer = null;
let timerInterval = null;
let currentTaskId = null;
let startTime = null;
let totalTime = 0;

// Статусы задач
const TASK_STATUS = {
    TODO: 'todo',
    IN_PROGRESS: 'in-progress',
    DONE: 'done',
    PAUSED: 'paused'
};

const STATUS_LABELS = {
    [TASK_STATUS.TODO]: 'Взять в работу',
    [TASK_STATUS.IN_PROGRESS]: 'В работе',
    [TASK_STATUS.DONE]: 'Готово',
    [TASK_STATUS.PAUSED]: 'Отложена'
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadTasks();
    setupEventListeners();
    renderTasks();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Модальное окно задач
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskModal = document.getElementById('taskModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const taskForm = document.getElementById('taskForm');

    addTaskBtn.addEventListener('click', () => openModal('taskModal'));
    closeModal.addEventListener('click', () => closeModalWindow('taskModal'));
    cancelBtn.addEventListener('click', () => closeModalWindow('taskModal'));
    
    // Закрытие модального окна при клике вне его
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeModalWindow('taskModal');
        }
    });

    taskForm.addEventListener('submit', handleTaskSubmit);

}

// Работа с модальными окнами
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModalWindow(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    if (modalId === 'taskModal') {
        document.getElementById('taskForm').reset();
    }
}

// Обработка создания/редактирования задачи
function handleTaskSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const editingTaskId = e.target.dataset.editingTaskId;
    
    if (editingTaskId) {
        // Редактирование существующей задачи
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.title = formData.get('title');
            task.description = formData.get('description');
            task.dueDate = formData.get('dueDate');
            task.color = formData.get('color');
            
            saveTasks();
            renderTasks();
            closeModalWindow('taskModal');
            showNotification('Задача обновлена!', 'success');
        }
        
        // Сбрасываем флаг редактирования
        e.target.dataset.editingTaskId = '';
        document.querySelector('#taskModal .modal-header h2').textContent = 'Создать новую задачу';
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Сохранить';
    } else {
        // Создание новой задачи
        const taskData = {
            id: generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            dueDate: formData.get('dueDate'),
            color: formData.get('color'),
            status: TASK_STATUS.TODO,
            createdAt: new Date().toISOString(),
            timeSpent: 0,
            timerRunning: false
        };

        tasks.push(taskData);
        saveTasks();
        renderTasks();
        closeModalWindow('taskModal');
        showNotification('Задача успешно создана!', 'success');
    }
}

// Генерация уникального ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Рендеринг задач
function renderTasks() {
    const board = document.getElementById('taskBoard');
    
    if (tasks.length === 0) {
        board.innerHTML = `
            <div class="drop-zone" style="grid-column: 1 / -1;">
                <i class="fas fa-tasks" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                <h3>Пока нет задач</h3>
                <p>Нажмите "Добавить задачу" чтобы создать первую задачу</p>
            </div>
        `;
        return;
    }

    board.innerHTML = tasks.map(task => createTaskSticker(task)).join('');
    
    // Добавляем обработчики событий для каждой задачи
    tasks.forEach(task => {
        const taskElement = document.getElementById(`task-${task.id}`);
        if (taskElement) {
            setupTaskEventListeners(taskElement, task);
        }
    });
}

// Создание стикера задачи
function createTaskSticker(task) {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не указана';
    const timeSpent = formatTime(task.timeSpent);
    const isTimerRunning = task.timerRunning;
    
    return `
        <div class="task-sticker ${getColorClass(task.color)}" id="task-${task.id}" data-task-id="${task.id}">
            <div class="task-header">
                <div>
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                </div>
                <button class="btn btn-danger" onclick="deleteTask('${task.id}')" style="padding: 5px 8px; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="task-description">${escapeHtml(task.description || '')}</div>
            
            <div class="task-meta">
                <div class="task-due-date">
                    <i class="fas fa-calendar"></i>
                    <span>${dueDate}</span>
                </div>
                <div class="task-time">
                    <i class="fas fa-clock"></i>
                    <span id="time-${task.id}">${timeSpent}</span>
                </div>
            </div>
            
            <select class="status-select status-${task.status}" onchange="updateTaskStatus('${task.id}', this.value)">
                ${Object.entries(STATUS_LABELS).map(([value, label]) => 
                    `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`
                ).join('')}
            </select>
            
            <div class="task-actions">
                ${isTimerRunning ? `
                    <button class="btn btn-warning" onclick="pauseTaskTimer('${task.id}')">
                        <i class="fas fa-pause"></i> Пауза
                    </button>
                    <button class="btn btn-danger" onclick="stopTaskTimer('${task.id}')">
                        <i class="fas fa-stop"></i> Стоп
                    </button>
                ` : `
                    <button class="btn btn-success" onclick="startTaskTimer('${task.id}')">
                        <i class="fas fa-play"></i> Старт
                    </button>
                `}
                <button class="btn btn-secondary" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
            </div>
        </div>
    `;
}

// Настройка обработчиков событий для задачи
function setupTaskEventListeners(taskElement, task) {
    // Drag and drop
    taskElement.draggable = true;
    
    taskElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        taskElement.classList.add('dragging');
    });
    
    taskElement.addEventListener('dragend', () => {
        taskElement.classList.remove('dragging');
    });
}

// Получение класса цвета
function getColorClass(color) {
    const colorMap = {
        '#FFD700': 'yellow',
        '#87CEEB': 'blue',
        '#98FB98': 'green',
        '#FFB6C1': 'pink',
        '#DDA0DD': 'purple',
        '#FFA500': 'orange'
    };
    return colorMap[color] || 'yellow';
}

// Обновление статуса задачи
function updateTaskStatus(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        saveTasks();
        showNotification(`Статус задачи изменен на "${STATUS_LABELS[newStatus]}"`, 'info');
    }
}

// Удаление задачи
function deleteTask(taskId) {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTasks();
        showNotification('Задача удалена', 'warning');
    }
}

// Редактирование задачи
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Заполняем форму данными задачи
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskDate').value = task.dueDate || '';
    document.querySelector(`input[name="color"][value="${task.color}"]`).checked = true;

    // Сохраняем ID редактируемой задачи
    const form = document.getElementById('taskForm');
    form.dataset.editingTaskId = taskId;
    
    // Изменяем заголовок модального окна
    document.querySelector('#taskModal .modal-header h2').textContent = 'Редактировать задачу';
    
    // Изменяем текст кнопки
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Обновить';

    openModal('taskModal');
}

// Работа с таймером
function startTaskTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Останавливаем все другие таймеры
    stopAllTimers();
    
    currentTaskId = taskId;
    startTime = Date.now();
    timerInterval = setInterval(() => updateTaskTimer(taskId), 1000);
    
    // Обновляем статус задачи на "В работе"
    task.status = TASK_STATUS.IN_PROGRESS;
    task.timerRunning = true;
    saveTasks();
    renderTasks();
    
    showNotification(`Таймер запущен для задачи "${task.title}"`, 'success');
}

function pauseTaskTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        
        if (startTime) {
            task.timeSpent += Date.now() - startTime;
            startTime = null;
        }
        
        // Обновляем статус задачи на "Отложена"
        task.status = TASK_STATUS.PAUSED;
        task.timerRunning = false;
        saveTasks();
        renderTasks();
        
        showNotification(`Таймер приостановлен для задачи "${task.title}"`, 'warning');
    }
}

function stopTaskTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        
        if (startTime) {
            task.timeSpent += Date.now() - startTime;
            startTime = null;
        }
        
        // Обновляем статус задачи на "Готово"
        task.status = TASK_STATUS.DONE;
        task.timerRunning = false;
        saveTasks();
        renderTasks();
        
        showNotification(`Таймер остановлен для задачи "${task.title}"`, 'info');
    }
}

function stopAllTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (currentTaskId && startTime) {
        const task = tasks.find(t => t.id === currentTaskId);
        if (task) {
            task.timeSpent += Date.now() - startTime;
            task.timerRunning = false;
        }
        startTime = null;
    }
}

function updateTaskTimer(taskId) {
    if (!startTime) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentTime = task.timeSpent + (Date.now() - startTime);
    const timeElement = document.getElementById(`time-${taskId}`);
    if (timeElement) {
        timeElement.textContent = formatTime(currentTime);
    }
}

// Форматирование времени
function formatTime(milliseconds) {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}ч ${minutes}м ${seconds}с`;
    } else if (minutes > 0) {
        return `${minutes}м ${seconds}с`;
    } else {
        return `${seconds}с`;
    }
}

// Утилиты
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#4299e1'
    };
    return colors[type] || '#4299e1';
}

// Сохранение и загрузка данных
function saveTasks() {
    localStorage.setItem('planner-tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem('planner-tasks');
    if (saved) {
        try {
            tasks = JSON.parse(saved);
        } catch (e) {
            console.error('Ошибка загрузки задач:', e);
            tasks = [];
        }
    }
}

// Добавляем CSS для анимаций уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
