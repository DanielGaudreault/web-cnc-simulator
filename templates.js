// CNC Template Library
const cncTemplates = {
    basic_grid: {
        name: "Basic Grid Pattern",
        description: "A simple grid pattern for testing and calibration",
        workpiece: { width: 100, height: 100, depth: 10 },
        gcode: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection
G94 ; Feed per minute

; Basic Grid Pattern
; Setup
G0 Z5 ; Rapid to safe height

; Main Grid Pattern
G0 X10 Y10
G1 Z-1 F500 ; Plunge to depth

; Horizontal Lines
G1 X90 F1000 ; Cut to X90
G0 Z2 ; Lift slightly
G0 X10 Y30 ; Move to next line
G1 Z-1 F500 ; Plunge
G1 X90 F1000 ; Cut
G0 Z2
G0 X10 Y50
G1 Z-1 F500
G1 X90 F1000
G0 Z2
G0 X10 Y70
G1 Z-1 F500
G1 X90 F1000
G0 Z2
G0 X10 Y90
G1 Z-1 F500
G1 X90 F1000

; Vertical Lines
G0 Z2
G0 X30 Y10
G1 Z-1 F500
G1 Y90 F1000
G0 Z2
G0 X50 Y10
G1 Z-1 F500
G1 Y90 F1000
G0 Z2
G0 X70 Y10
G1 Z-1 F500
G1 Y90 F1000

; Cleanup
G0 Z5 ; Retract to safe height
G0 X0 Y0 ; Return to origin

M30 ; Program end`,

        settings: {
            toolDiameter: 3,
            feedRate: 1000,
            spindleSpeed: 12000
        }
    },

    pocketing: {
        name: "Square Pocketing",
        description: "Multiple square pockets at different depths",
        workpiece: { width: 80, height: 80, depth: 15 },
        gcode: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection
G94 ; Feed per minute

; Square Pocketing Operations
G0 Z5 ; Safe height

; First pocket - shallow
G0 X20 Y20
G1 Z0 F500
G1 Z-3 F200 ; Step down
G1 X60 F800 ; Pocket routine
G1 Y60
G1 X20
G1 Y20
G1 Z-6 F200 ; Second step
G1 X60 F800
G1 Y60
G1 X20
G1 Y20
G0 Z5

; Second pocket - deeper
G0 X40 Y40
G1 Z0 F500
G1 Z-4 F200
G1 X70 F800
G1 Y70
G1 X40
G1 Y40
G1 Z-8 F200
G1 X70 F800
G1 Y70
G1 X40
G1 Y40
G1 Z-12 F200
G1 X70 F800
G1 Y70
G1 X40
G1 Y40
G0 Z5

; Return home
G0 X0 Y0
M30`,

        settings: {
            toolDiameter: 6,
            feedRate: 800,
            spindleSpeed: 10000
        }
    },

    contouring: {
        name: "Contour Profiling",
        description: "External contour profiling with corner radii",
        workpiece: { width: 120, height: 80, depth: 12 },
        gcode: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection
G94 ; Feed per minute

; Contour Profiling
G0 Z5 ; Safe height

; Approach position
G0 X10 Y10
G1 Z-8 F500 ; Plunge to depth

; Main contour with rounded corners
G1 X110 F1000 ; Bottom edge
G3 X120 Y20 I0 J10 ; Bottom-right corner
G1 Y60 ; Right edge
G3 X110 Y70 I-10 J0 ; Top-right corner
G1 X10 ; Top edge
G3 X0 Y60 I0 J-10 ; Top-left corner
G1 Y20 ; Left edge
G3 X10 Y10 I10 J0 ; Bottom-left corner

; Cleanup pass
G1 Z-8.5 F300 ; Final depth
G1 X110 F800
G3 X120 Y20 I0 J10
G1 Y60
G3 X110 Y70 I-10 J0
G1 X10
G3 X0 Y60 I0 J-10
G1 Y20
G3 X10 Y10 I10 J0

G0 Z5 ; Retract
G0 X0 Y0 ; Home

M30`,

        settings: {
            toolDiameter: 8,
            feedRate: 800,
            spindleSpeed: 8000
        }
    },

    drilling: {
        name: "Drilling Pattern",
        description: "Grid of drilling operations with peck cycling",
        workpiece: { width: 100, height: 100, depth: 20 },
        gcode: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection
G94 ; Feed per minute

; Drilling Pattern with Peck Cycles
G0 Z5 ; Safe height

; Drill pattern coordinates
; Row 1
G0 X20 Y20
G98 G81 Z-15 R2 F300 ; Drill cycle
G0 X40 Y20
G98 G81 Z-15 R2 F300
G0 X60 Y20
G98 G81 Z-15 R2 F300
G0 X80 Y20
G98 G81 Z-15 R2 F300

; Row 2
G0 X20 Y40
G98 G81 Z-15 R2 F300
G0 X40 Y40
G98 G81 Z-15 R2 F300
G0 X60 Y40
G98 G81 Z-15 R2 F300
G0 X80 Y40
G98 G81 Z-15 R2 F300

; Row 3
G0 X20 Y60
G98 G81 Z-15 R2 F300
G0 X40 Y60
G98 G81 Z-15 R2 F300
G0 X60 Y60
G98 G81 Z-15 R2 F300
G0 X80 Y60
G98 G81 Z-15 R2 F300

; Row 4
G0 X20 Y80
G98 G81 Z-15 R2 F300
G0 X40 Y80
G98 G81 Z-15 R2 F300
G0 X60 Y80
G98 G81 Z-15 R2 F300
G0 X80 Y80
G98 G81 Z-15 R2 F300

G80 ; Cancel cycle
G0 Z5 ; Retract

M30`,

        settings: {
            toolDiameter: 4,
            feedRate: 300,
            spindleSpeed: 5000
        }
    },

    engraving: {
        name: "Text Engraving",
        description: "Simple text engraving demonstration",
        workpiece: { width: 100, height: 60, depth: 8 },
        gcode: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection
G94 ; Feed per minute

; Text Engraving - "CNC"
G0 Z5 ; Safe height

; Letter C
G0 X15 Y40
G1 Z-1 F500
G3 X25 Y40 I5 J0 F800
G1 Y30
G3 X15 Y30 I-5 J0
G0 Z2

; Letter N
G0 X35 Y40
G1 Z-1 F500
G1 Y30 F800
G1 X45 Y40
G1 Y30
G0 Z2

; Letter C
G0 X55 Y40
G1 Z-1 F500
G3 X65 Y40 I5 J0 F800
G1 Y30
G3 X55 Y30 I-5 J0

; Border
G0 Z2
G0 X10 Y45
G1 Z-1 F500
G1 X70 F800
G1 Y25
G1 X10
G1 Y45

G0 Z5 ; Retract
G0 X0 Y0 ; Home

M30`,

        settings: {
            toolDiameter: 2,
            feedRate: 600,
            spindleSpeed: 15000
        }
    },

    "3d_surface": {
        name: "3D Surface Machining",
        description: "Simple 3D surface with multiple Z-levels",
        workpiece: { width: 80, height: 80, depth: 15 },
        gcode: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection
G94 ; Feed per minute

; 3D Surface Machining
G0 Z5 ; Safe height

; Surface roughing - multiple Z levels
G0 X10 Y10

; Level 1: Z-2
G1 Z-2 F500
G1 X70 F1000
G1 Y20
G1 X10
G1 Y30
G1 X70
G1 Y40
G1 X10
G1 Y50
G1 X70
G1 Y60
G1 X10
G1 Y70
G1 X70
G0 Z2

; Level 2: Z-4
G0 X10 Y10
G1 Z-4 F500
G1 X70 F1000
G1 Y20
G1 X10
G1 Y30
G1 X70
G1 Y40
G1 X10
G1 Y50
G1 X70
G1 Y60
G1 X10
G1 Y70
G1 X70
G0 Z2

; Level 3: Z-6 (domed area)
G0 X30 Y30
G1 Z-6 F500
G1 X50 F1000
G1 Y40
G1 X30
G1 Y50
G1 X50
G0 Z2

G0 X35 Y35
G1 Z-7 F500
G1 X45 F1000
G1 Y45
G1 X35
G1 Y35
G0 Z2

; Final cleanup
G0 Z5
G0 X0 Y0

M30`,

        settings: {
            toolDiameter: 6,
            feedRate: 1000,
            spindleSpeed: 12000
        }
    }
};

// Template loader function
function loadTemplate(templateName) {
    if (cncTemplates[templateName]) {
        const template = cncTemplates[templateName];
        
        // Update workpiece dimensions
        document.getElementById('workpieceWidth').value = template.workpiece.width;
        document.getElementById('workpieceHeight').value = template.workpiece.height;
        document.getElementById('workpieceDepth').value = template.workpiece.depth;
        
        // Update tool settings
        document.getElementById('toolDiameter').value = template.settings.toolDiameter;
        document.getElementById('feedRate').value = template.settings.feedRate;
        document.getElementById('spindleSpeed').value = template.settings.spindleSpeed;
        
        // Load G-code
        document.getElementById('gcodeEditor').value = template.gcode;
        
        // Update template selector
        document.getElementById('templateSelector').value = templateName;
        
        // Create workpiece and parse G-code
        if (simulator) {
            createWorkpiece();
            simulator.parseGCode(template.gcode);
        }
        
        showNotification(`Loaded template: ${template.name}`);
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize default template
function initializeDefaultTemplate() {
    loadTemplate('basic_grid');
}
