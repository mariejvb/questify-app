// This event listener ensures the script runs only after the dashboard.html page is fully loaded.
document.addEventListener('DOMContentLoaded', () => {

    // Get references to the HTML elements where the stats will be displayed.
    const levelStatEl = document.getElementById('level-stat');
    const questsCompletedStatEl = document.getElementById('quests-completed-stat');
    const tasksCompletedStatEl = document.getElementById('tasks-completed-stat');
    const totalXpStatEl = document.getElementById('total-xp-stat');

    /**
     * Calculates the XP needed for a given level based on the scaling formula.
     * This function is duplicated from the main script to make this file self-contained.
     * @param {number} level The level to calculate the cost for.
     * @returns {number} The XP required to complete that level.
     */
    function getXpForLevel(level) {
        return 100 + ((level - 1) * 20);
    }

    /**
     * Reads the saved state from Local Storage, calculates all necessary stats, and displays them.
     */
    function loadAndDisplayStats() {
        // Retrieve the saved data string from Local Storage.
        const savedStateJSON = localStorage.getItem('questifyGameState');
        
        // If no saved data exists, display default values.
        if (!savedStateJSON) {
            levelStatEl.textContent = '1';
            questsCompletedStatEl.textContent = '0';
            tasksCompletedStatEl.textContent = '0';
            totalXpStatEl.textContent = '0';
            return;
        }

        // Parse the JSON string back into a JavaScript object.
        const state = JSON.parse(savedStateJSON);
        const player = state.player || { level: 1, xp: 0 };
        const quests = state.quests || [];

        // --- STAT CALCULATIONS ---

        // 1. Quests Completed: Filter the quests array for items where 'isComplete' is true.
        const questsCompleted = quests.filter(q => q.isComplete).length;

        // 2. Tasks Completed: Use 'reduce' to iterate through all quests and sum up their completed tasks.
        const tasksCompleted = quests.reduce((total, quest) => {
            const completedInThisQuest = quest.tasks.filter(task => task.completed).length;
            return total + completedInThisQuest;
        }, 0);
        
        // 3. Lifetime XP: Calculate the XP from all previous levels, then add the current XP.
        let xpFromPreviousLevels = 0;
        for (let i = 1; i < player.level; i++) {
            xpFromPreviousLevels += getXpForLevel(i);
        }
        const totalLifetimeXp = xpFromPreviousLevels + player.xp;

        // --- DISPLAY STATS ---
        // Update the HTML elements with the calculated values.
        levelStatEl.textContent = player.level;
        questsCompletedStatEl.textContent = questsCompleted;
        tasksCompletedStatEl.textContent = tasksCompleted;
        totalXpStatEl.textContent = totalLifetimeXp;
    }

    // This is the initial function call that runs when the dashboard page loads.
    loadAndDisplayStats();
});