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
    
    // Инициализируем календарь с небольшой задержкой
    setTimeout(() => {
        renderWeekCalendar();
    }, 100);
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
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => changeWeek(-1));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => changeWeek(1));

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
        setTimeout(() => {
            renderWeekCalendar();
        }, 50);
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
        setTimeout(() => {
            renderWeekCalendar();
        }, 50);
    }
}

// Работа с календарем
function changeWeek(direction) {
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    renderWeekCalendar();
}

function renderWeekCalendar() {
    const weekCalendar = document.getElementById('weekCalendar');
    const currentWeekEl = document.getElementById('currentWeek');
    
    if (!weekCalendar || !currentWeekEl) {
        console.log('Элементы календаря не найдены:', { weekCalendar, currentWeekEl });
        return;
    }

    console.log('Рендеринг календаря, всего задач:', tasks.length);
    console.log('Задачи с датами:', tasks.filter(task => task.dueDate));

    // Получаем начало недели (понедельник)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    // Обновляем заголовок
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const startMonth = monthNames[startOfWeek.getMonth()];
    const endMonth = monthNames[endOfWeek.getMonth()];
    const startYear = startOfWeek.getFullYear();
    const endYear = endOfWeek.getFullYear();
    
    if (startMonth === endMonth && startYear === endYear) {
        currentWeekEl.textContent = `${startMonth} ${startYear}`;
    } else if (startYear === endYear) {
        currentWeekEl.textContent = `${startMonth} - ${endMonth} ${startYear}`;
    } else {
        currentWeekEl.textContent = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }

    // Очищаем календарь
    weekCalendar.innerHTML = '';
    console.log('Календарь очищен, начинаем создание дней');

    // Названия дней недели
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // Создаем дни недели
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';
        
        if (dayDate.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        // Получаем задачи на этот день
        const dayTasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === dayDate.toDateString();
        });

        // Отладочная информация
        if (dayTasks.length > 0) {
            console.log(`День ${dayDate.getDate()}: найдено ${dayTasks.length} задач`, dayTasks);
        }

        dayEl.innerHTML = `
            <div class="week-day-header">
                <div class="week-day-name">${dayNamesShort[i]}</div>
                <div class="week-day-number">${dayDate.getDate()}</div>
            </div>
            <div class="week-tasks">
                ${dayTasks.map(task => `
                    <div class="week-task ${getColorClass(task.color)}" onclick="focusTask('${task.id}')" title="${escapeHtml(task.title)}">
                        <div class="week-task-title">${escapeHtml(task.title)}</div>
                        <div class="week-task-time">${formatTime(task.timeSpent)}</div>
                    </div>
                `).join('')}
                ${dayTasks.length === 0 ? '<div style="color: #94a3b8; font-size: 0.8rem; text-align: center; padding: 20px;">Нет задач</div>' : ''}
            </div>
        `;

        weekCalendar.appendChild(dayEl);
    }
    
    console.log('Календарь отрендерен, создано дней:', weekCalendar.children.length);
}

// Функция для фокуса на задаче в Kanban
function focusTask(taskId) {
    // Переключаемся на Kanban
    switchTab('kanban');
    
    // Находим задачу и прокручиваем к ней
    setTimeout(() => {
        const taskElement = document.getElementById(`task-${taskId}`);
        if (taskElement) {
            taskElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Добавляем эффект подсветки
            taskElement.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
                taskElement.style.animation = '';
            }, 1000);
        }
    }, 100);
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
