const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

const aiService = new AIService();

// POST /api/ai/chat - Main AI chat endpoint
router.post('/chat', async (req, res) => {
    try {
        const { data, userQuery } = req.body;

        // Validation
        if (!data) {
            return res.status(400).json({
                error: 'Missing required field: data'
            });
        }

        console.log(`[AI Chat] Processing query: "${userQuery || 'insights generation'}"`);

        // Call AI service
        const response = await aiService.generateInsights(data, userQuery);

        // Log success
        console.log(`[AI Chat] ✓ Response generated successfully`);

        res.json({
            success: true,
            response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[AI Chat] ✗ Error:', error.message);

        // Return user-friendly error
        res.status(500).json({
            success: false,
            error: 'AI processing failed',
            message: error.message || 'Unable to process your request at this time',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /api/ai/recommendations - Project recommendations endpoint
router.post('/recommendations', async (req, res) => {
    try {
        const { projectDetail } = req.body;

        if (!projectDetail) {
            return res.status(400).json({
                error: 'Missing required field: projectDetail'
            });
        }

        console.log(`[AI Recommendations] Processing for project: ${projectDetail.project?.name || 'Unknown'}`);

        const recommendations = await aiService.generateProjectRecommendations(projectDetail);

        console.log(`[AI Recommendations] ✓ Generated ${recommendations.length} recommendations`);

        res.json({
            success: true,
            recommendations,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[AI Recommendations] ✗ Error:', error.message);

        res.status(500).json({
            success: false,
            error: 'Recommendation generation failed',
            message: error.message || 'Unable to generate recommendations',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
