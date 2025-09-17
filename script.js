// Глобальные переменные
let tasks = [];
let currentTimer = null;
let timerInterval = null;
let currentTaskId = null;
let startTime = null;
let totalTime = 0;
let currentDate = new Date();

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
    setupColumnEventListeners();
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

    // Вкладки
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Календарь
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));

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
    const kanbanBoard = document.getElementById('kanbanBoard');
    
    // Очищаем все колонки
    Object.values(TASK_STATUS).forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (column) {
            column.innerHTML = '';
        }
    });
    
    if (tasks.length === 0) {
        // Показываем сообщение в первой колонке
        const firstColumn = document.getElementById('column-todo');
        if (firstColumn) {
            firstColumn.innerHTML = `
                <div class="empty-column">
                    <i class="fas fa-tasks" style="font-size: 2rem; margin-bottom: 15px; display: block; color: #a0aec0;"></i>
                    <h4 style="color: #a0aec0; margin-bottom: 10px;">Пока нет задач</h4>
                    <p style="color: #a0aec0; font-size: 0.9rem;">Нажмите "Добавить задачу" чтобы создать первую задачу</p>
                </div>
            `;
        }
        updateTaskCounts();
        return;
    }

    // Распределяем задачи по колонкам
    tasks.forEach(task => {
        const column = document.getElementById(`column-${task.status}`);
        if (column) {
            const taskElement = createTaskSticker(task);
            column.insertAdjacentHTML('beforeend', taskElement);
            
            // Добавляем обработчики событий
            const taskEl = document.getElementById(`task-${task.id}`);
            if (taskEl) {
                setupTaskEventListeners(taskEl, task);
            }
        }
    });
    
    updateTaskCounts();
    
    // Обновляем календарь, если он активен
    if (document.getElementById('calendarTab').classList.contains('active')) {
        renderCalendar();
    }
}

// Обновление счетчиков задач
function updateTaskCounts() {
    Object.values(TASK_STATUS).forEach(status => {
        const count = tasks.filter(task => task.status === status).length;
        const countElement = document.getElementById(`count-${status}`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Создание стикера задачи
function createTaskSticker(task) {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Не указана';
    const timeSpent = formatTime(task.timeSpent);
    const isTimerRunning = task.timerRunning;
    const shortTitle = task.title.length > 16 ? task.title.substring(0, 16) + '...' : task.title;
    
    return `
        <div class="task-sticker ${getColorClass(task.color)}" id="task-${task.id}" data-task-id="${task.id}">
            <div class="task-header">
                <div>
                    <h3 class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(shortTitle)}</h3>
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
            
            <div class="task-status">
                <span class="status-badge status-${task.status}">${STATUS_LABELS[task.status]}</span>
            </div>
            
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
        // Убираем подсветку со всех колонок
        document.querySelectorAll('.column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
    });
}

// Настройка drag & drop для колонок
function setupColumnEventListeners() {
    document.querySelectorAll('.column-content').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', (e) => {
            if (!column.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });
        
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = column.closest('.kanban-column').dataset.status;
            
            updateTaskStatus(taskId, newStatus);
        });
    });
}

// Получение класса цвета
function getColorClass(color) {
    const colorMap = {
        '#fbbf24': 'yellow',
        '#60a5fa': 'blue',
        '#34d399': 'green',
        '#f472b6': 'pink',
        '#a78bfa': 'purple',
        '#fb923c': 'orange'
    };
    return colorMap[color] || 'yellow';
}

// Обновление статуса задачи
function updateTaskStatus(taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
        task.status = newStatus;
        saveTasks();
        renderTasks();
        showNotification(`Задача перемещена в "${STATUS_LABELS[newStatus]}"`, 'info');
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

// Переключение вкладок
function switchTab(tabName) {
    // Обновляем кнопки вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Обновляем контент вкладок
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Если переключаемся на календарь, обновляем его
    if (tabName === 'calendar') {
        renderCalendar();
    }
}

// Работа с календарем
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthEl = document.getElementById('currentMonth');
    
    if (!calendarGrid || !currentMonthEl) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Обновляем заголовок
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Очищаем календарь
    calendarGrid.innerHTML = '';

    // Добавляем заголовки дней недели
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'weekday-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });

    // Получаем первый день месяца и количество дней
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = (firstDay.getDay() + 6) % 7; // Понедельник = 0

    // Добавляем дни предыдущего месяца
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.innerHTML = `
            <div class="day-number">${prevMonth.getDate() - i}</div>
        `;
        calendarGrid.appendChild(day);
    }

    // Добавляем дни текущего месяца
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (dayDate.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        // Получаем задачи на этот день
        const dayTasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === dayDate.toDateString();
        });

        dayEl.innerHTML = `
            <div class="day-header">
                <div class="day-number">${day}</div>
                ${dayTasks.length > 0 ? `<div class="day-tasks-count">${dayTasks.length}</div>` : ''}
            </div>
            <div class="calendar-tasks">
                ${dayTasks.slice(0, 3).map(task => `
                    <div class="calendar-task ${getColorClass(task.color)}" onclick="editTask('${task.id}')" title="${escapeHtml(task.title)}">
                        ${escapeHtml(task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title)}
                    </div>
                `).join('')}
                ${dayTasks.length > 3 ? `<div class="calendar-task" style="opacity: 0.7;">+${dayTasks.length - 3} еще</div>` : ''}
            </div>
        `;

        calendarGrid.appendChild(dayEl);
    }

    // Добавляем дни следующего месяца
    const remainingDays = 42 - (startDay + daysInMonth); // 6 недель * 7 дней
    for (let day = 1; day <= remainingDays; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.innerHTML = `
            <div class="day-number">${day}</div>
        `;
        calendarGrid.appendChild(dayEl);
    }
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
