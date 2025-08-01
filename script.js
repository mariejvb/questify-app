// The 'DOMContentLoaded' event listener ensures that the entire script runs only after the full HTML document has been loaded and parsed.
// This prevents errors that could occur from trying to access elements that don't exist yet.
document.addEventListener('DOMContentLoaded', () => {

    // =================================
    //  1. ELEMENT REFERENCES
    // =================================
    // It's a best practice to get all necessary DOM element references at the top of the script for easy access and organization.
    const body = document.body;
    const questLogToggle = document.getElementById('quest-log-toggle');
    const goalInput = document.getElementById('goal-input');
    const submitGoalButton = document.getElementById('submit-goal');
    const questLogList = document.getElementById('quest-log-list');
    const completedQuestsList = document.getElementById('completed-quests-list');
    const currentGoalDisplay = document.getElementById('current-goal-display');
    const questsContainer = document.getElementById('quests-container');
    const levelSpan = document.getElementById('level');
    const xpCountSpan = document.getElementById('xp-count');
    const progressBar = document.getElementById('progress-bar');
    const resetProgressButton = document.getElementById('reset-progress-button');
    const levelUpModal = document.getElementById('level-up-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseButton = document.getElementById('modal-close-button');

    // =================================
    //  2. STATE VARIABLES
    // =================================
    // These variables hold the entire state of the application. They are declared with 'let' because they will be reassigned.
    let player = { level: 1, xp: 0 };
    let quests = [];
    let activeQuestId = null;
    let levelUpPending = false; // A flag to handle the sequential display of "Goal Achieved" and "Level Up" modals.
    const GOAL_COMPLETE_BONUS = 75; // A constant for the bonus XP awarded upon completing a main goal.

    // =================================
    //  3. CORE FUNCTIONS
    // =================================

    /**
     * Saves the current application state to the browser's Local Storage.
     * This allows the user's progress to persist between sessions.
     * The state object is converted to a JSON string because Local Storage can only store strings.
     */
    function saveState() {
        const state = {
            player: player,
            quests: quests,
            activeQuestId: activeQuestId,
            isLogCollapsed: body.classList.contains('log-collapsed')
        };
        localStorage.setItem('questifyGameState', JSON.stringify(state));
    }

    /**
     * Loads the application state from Local Storage when the page is first opened.
     * If a saved state exists, it parses the JSON string back into an object and updates the state variables.
     * It then calls the necessary functions to render the UI based on this loaded data.
     */
    function loadState() {
        const savedState = localStorage.getItem('questifyGameState');
        if (savedState) {
            const state = JSON.parse(savedState);
            player = state.player || { level: 1, xp: 0 };
            quests = state.quests || [];
            activeQuestId = state.activeQuestId;
            if (state.isLogCollapsed) {
                body.classList.add('log-collapsed');
            }
        }
        // These functions are called to ensure the UI is in sync with the state on initial load.
        updateUI();
        renderQuestLog();
        displayActiveQuest();
    }

    /**
     * Renders the lists of active and completed quests in the sidebar (Quest Log).
     * It filters the main 'quests' array and dynamically creates HTML elements for each quest.
     */
    function renderQuestLog() {
        questLogList.innerHTML = '';
        completedQuestsList.innerHTML = '';

        const activeQuests = quests.filter(q => !q.isComplete);
        const completedQuests = quests.filter(q => q.isComplete);

        if (activeQuests.length === 0) {
            questLogList.innerHTML = '<p style="color: #888; text-align: center;">No active quests.</p>';
        } else {
            activeQuests.forEach(quest => {
                const questItem = document.createElement('div');
                questItem.className = 'quest-log-item';
                questItem.dataset.questId = quest.id;

                // Create a span for the text to allow for flexible layout.
                const textSpan = document.createElement('span');
                textSpan.className = 'quest-log-text';
                textSpan.textContent = quest.goal;
                
                // Add an event listener to the main item for selection.
                questItem.addEventListener('click', () => {
                    activeQuestId = quest.id;
                    saveState();
                    renderQuestLog();
                    displayActiveQuest();
                });

                // Create the delete button.
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-quest-button';
                deleteButton.innerHTML = '×'; // A simple "X" character.

                deleteButton.addEventListener('click', (event) => {
                    // This is crucial to prevent the questItem's click event from firing when the button is clicked.
                    event.stopPropagation(); 
                    handleDeleteQuest(quest.id);
                });

                if (quest.id === activeQuestId) {
                    questItem.classList.add('active');
                }

                questItem.appendChild(textSpan);
                questItem.appendChild(deleteButton);
                questLogList.appendChild(questItem);
            });
        }
        
        completedQuests.forEach(quest => {
            const questItem = document.createElement('div');
            questItem.className = 'quest-log-item completed';
            
            // Completed quests don't get a delete button, just text.
            const textSpan = document.createElement('span');
            textSpan.className = 'quest-log-text';
            textSpan.textContent = quest.goal;
            questItem.appendChild(textSpan);

            completedQuestsList.appendChild(questItem);
        });
    }
    
    /**
     * Renders the detailed view (list of tasks) for the currently selected active quest.
     */
    function displayActiveQuest() {
        const quest = quests.find(q => q.id === activeQuestId);
        if (!quest) {
            currentGoalDisplay.textContent = 'Select a quest from your log or add a new one.';
            questsContainer.innerHTML = '';
            return;
        }

        currentGoalDisplay.textContent = `Your Quest: "${quest.goal}"`;
        questsContainer.innerHTML = ''; // Clear any previously displayed tasks.

        quest.tasks.forEach((task, index) => {
            // Dynamically create the HTML for each task item.
            const taskItem = document.createElement('div');
            taskItem.className = 'quest-item';

            const questLabelContainer = document.createElement('div');
            questLabelContainer.className = 'quest-label-container';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `quest-${quest.id}-task-${index}`;
            checkbox.checked = task.completed;
            checkbox.dataset.xp = task.xp;
            checkbox.addEventListener('change', () => handleTaskCompletion(quest.id, index));
            
            const label = document.createElement('label');
            label.htmlFor = `quest-${quest.id}-task-${index}`;
            label.textContent = task.text;
            
            questLabelContainer.appendChild(checkbox);
            questLabelContainer.appendChild(label);
            
            const controlsContainer = document.createElement('div');
            controlsContainer.style.display = 'flex';
            controlsContainer.style.alignItems = 'center';

            const badge = document.createElement('span');
            badge.className = `difficulty-badge difficulty-${task.difficulty.toLowerCase()}`;
            badge.textContent = task.difficulty;
            controlsContainer.appendChild(badge);

            if (task.completed) {
                checkbox.disabled = true;
                label.classList.add('completed');
                badge.classList.add('completed');
            } else {
                const refreshButton = document.createElement('button');
                refreshButton.className = 'refresh-button';
                refreshButton.textContent = 'Refresh';
                refreshButton.addEventListener('click', (e) => handleRefreshTask(quest.id, index, e));
                controlsContainer.appendChild(refreshButton);
            }

            taskItem.appendChild(questLabelContainer);
            taskItem.appendChild(controlsContainer);
            questsContainer.appendChild(taskItem);
        });
    }

    /**
     * Handles the submission of a new goal. It calls the backend API to generate tasks.
     * The 'async' keyword allows the use of 'await' for the network request.
     */
    async function handleGoalSubmission() {
        const goal = goalInput.value.trim();
        if (!goal) return; // Do nothing if the input is empty.

        submitGoalButton.disabled = true;
        submitGoalButton.textContent = 'Generating...';

        try {
            // The 'fetch' API is used to send a POST request to the Python backend.
            const response = await fetch('/api/generate-quests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: goal }),
            });
            if (!response.ok) throw new Error('Failed to fetch quests');
            
            const data = await response.json();

            // Creates a new quest object with a unique ID based on the current timestamp.
            const newQuest = {
                id: Date.now(),
                goal: goal,
                tasks: data.quests.map(task => ({ ...task, completed: false })),
                isComplete: false,
            };

            quests.push(newQuest);
            activeQuestId = newQuest.id; // The new quest becomes the active one.
            goalInput.value = '';

            // Update state and UI.
            saveState();
            renderQuestLog();
            displayActiveQuest();

        } catch (error) {
            showToast("Could not generate new quest.");
        } finally {
            // The 'finally' block ensures this code runs whether the request succeeded or failed.
            submitGoalButton.disabled = false;
            submitGoalButton.textContent = 'Add New Quest';
        }
    }
    
    /**
     * Handles the completion of a single task. This is the core game loop function.
     * It awards XP, checks for goal completion, checks for level ups, and triggers UI updates.
     */
    function handleTaskCompletion(questId, taskIndex) {
        const quest = quests.find(q => q.id === questId);
        if (!quest) return;

        const task = quest.tasks[taskIndex];
        if (task.completed) return; // Prevents earning XP multiple times for the same task.

        task.completed = true;
        const xpGained = parseInt(task.xp, 10);
        player.xp += xpGained;
        showToast(`+${xpGained} XP`);
        
        displayActiveQuest(); // Re-render immediately to show the checked state.
        
        let leveledUp = false;
        const allTasksCompleted = quest.tasks.every(t => t.completed);

        if (allTasksCompleted) {
            quest.isComplete = true; // Mark the parent quest as complete.
            player.xp += GOAL_COMPLETE_BONUS;
            // A timeout provides a slight delay for the bonus toast, making the UI feel less cluttered.
            setTimeout(() => { showToast(`+${GOAL_COMPLETE_BONUS} Goal Bonus!`, true); }, 500);
            renderQuestLog(); // Re-render the log to move the quest to the "Completed" section.
        }

        // A 'while' loop is used to handle cases where a user might gain enough XP to level up multiple times at once.
        while (player.xp >= getXpForLevel(player.level)) {
            const xpNeeded = getXpForLevel(player.level);
            player.xp -= xpNeeded;
            player.level++;
            leveledUp = true;
        }

        // This logic determines which modal to show, prioritizing the "Goal Achieved" message.
        if (allTasksCompleted) {
            modalTitle.textContent = 'Goal Achieved!';
            modalMessage.innerHTML = `You completed "${quest.goal}" and earned a ${GOAL_COMPLETE_BONUS} XP bonus!`;
            modalCloseButton.textContent = 'Continue';
            levelUpModal.classList.remove('hidden');
            if (leveledUp) {
                levelUpPending = true; // Queue the level up modal to show next.
            }
        } else if (leveledUp) {
            modalTitle.textContent = 'Level Up!';
            modalMessage.textContent = `You've reached Level ${player.level}!`;
            modalCloseButton.textContent = 'Continue';
            levelUpModal.classList.remove('hidden');
        }
        
        updateUI();
        saveState();
    }
    
    /**
     * Handles refreshing a single task by calling the dedicated backend endpoint.
     */
    async function handleRefreshTask(questId, taskIndex, event) {
        const quest = quests.find(q => q.id === questId);
        if (!quest) return;
        const refreshButton = event.target;
        refreshButton.disabled = true;
        refreshButton.textContent = '...';
        try {
            const response = await fetch('/api/refresh-quest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: quest.goal,
                    existing_quests: quest.tasks,
                    quest_to_replace: quest.tasks[taskIndex]
                }),
            });
            if (!response.ok) throw new Error('Failed to refresh task.');
            const data = await response.json();
            // Replaces the old task object with the new one from the server.
            quest.tasks[taskIndex] = { ...data.new_quest, completed: false };
            
            displayActiveQuest();
            saveState();
        } catch (error) {
            showToast("Could not refresh task.");
            refreshButton.disabled = false; // Re-enable the button if the refresh fails.
            refreshButton.textContent = 'Refresh';
        }
    }
    
    /**
     * Updates all UI elements related to player stats (Level, XP, progress bar).
     * This is a dedicated function to avoid repeating code.
     */
    function updateUI() {
        const xpNeeded = getXpForLevel(player.level);
        levelSpan.textContent = player.level;
        xpCountSpan.textContent = `${player.xp} / ${xpNeeded}`;
        progressBar.style.width = `${(player.xp / xpNeeded) * 100}%`;
    }
    
    /**
     * Resets all progress after getting user confirmation.
     */
    function resetProgress() {
        // The 'confirm' dialog is a simple way to prevent accidental data loss.
        const isConfirmed = confirm("Are you sure you want to reset ALL progress? This cannot be undone.");
        if (isConfirmed) {
            player = { level: 1, xp: 0 };
            quests = [];
            activeQuestId = null;
            localStorage.removeItem('questifyGameState');
            
            updateUI();
            renderQuestLog();
            displayActiveQuest();
            
            showToast("Progress has been reset.");
        }
    }
    
    /**
     * Calculates the XP required to reach the next level based on a scaling formula.
     * @param {number} level The current level.
     * @returns {number} The total XP needed to complete the current level.
     */
    function getXpForLevel(level) {
        return 100 + ((level - 1) * 20); // Each level costs 20 more XP than the last.
    }

    /**
     * Displays a temporary "toast" notification at the bottom of the screen.
     * @param {string} message The text to display in the toast.
     * @param {boolean} isBonus If true, applies a special style for bonus notifications.
     */
    function showToast(message, isBonus = false) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        if (isBonus) {
            toast.classList.add('toast-bonus');
        }
        toast.textContent = message;
        document.body.appendChild(toast);
        // The toast automatically removes itself from the DOM after 3 seconds.
        setTimeout(() => { toast.remove(); }, 3000);
    }
    
    // =================================
    //  4. EVENT LISTENERS
    // =================================
    // Attaches all the necessary event listeners to the interactive elements.

    // Handles the collapsing of the sidebar.
    questLogToggle.addEventListener('click', () => {
        body.classList.toggle('log-collapsed');
        saveState();
    });

    // Handles adding a new quest via button click or by pressing Enter.
    submitGoalButton.addEventListener('click', handleGoalSubmission);
    goalInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGoalSubmission(); });
    
    // Handles the reset progress button.
    resetProgressButton.addEventListener('click', resetProgress);
    
    // Handles the "Continue" button on the modal, including the logic for the pending level up message.
    modalCloseButton.addEventListener('click', () => {
        if (levelUpPending) {
            levelUpPending = false; // Clear the flag.
            // Transform the current modal into the Level Up modal instead of closing it.
            modalTitle.textContent = 'Level Up!';
            modalMessage.textContent = `You've reached Level ${player.level}!`;
            modalCloseButton.textContent = 'Continue';
        } else {
            levelUpModal.classList.add('hidden'); // Just hide it.
        }
    });

    //  Handles the deletion of a main quest from the Quest Log.
    function handleDeleteQuest(questId) {
        // A confirmation dialog is crucial for destructive actions.
        const isConfirmed = confirm("Are you sure you want to delete this quest? This cannot be undone.");

        if (isConfirmed) {
            // Filters the main quests array, keeping everything EXCEPT the quest with the matching ID.
            quests = quests.filter(q => q.id !== questId);

            // If the deleted quest was the currently active one, reset the active view.
            if (activeQuestId === questId) {
                activeQuestId = null;
            }

            // Save the new state and re-render the entire UI.
            saveState();
            renderQuestLog();
            displayActiveQuest();
            showToast("Quest deleted.");
        }
    }

    // =================================
    //  5. INITIAL LOAD
    // =================================
    // This is the very first function call that kicks off the application when the page loads.
    loadState();
});