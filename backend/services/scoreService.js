const calculateScore = (questions, answers) => {
    let score = 0;

    questions.forEach((question, index) => {
        if (
            answers[index] !== undefined &&
            Number(answers[index]) === Number(question.correctAnswer)
        ) {
            score++;
        }
    });

    const totalQuestions = questions.length;

    const percentage =
        totalQuestions > 0
            ? Math.round((score / totalQuestions) * 100)
            : 0;

    return {
        score,
        totalQuestions,
        percentage
    };
};

module.exports = {
    calculateScore
};