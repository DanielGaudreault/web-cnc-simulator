// G-code examples library
const gcodeExamples = {
    square: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection

; Square Pocket Example
G0 Z5 ; Rapid to safe height
G0 X20 Y20 ; Rapid to start position
G1 Z-2 F500 ; Plunge cut
G1 X80 F1000 ; Cut to X80
G1 Y80 ; Cut to Y80
G1 X20 ; Cut to X20
G1 Y20 ; Cut back to start
G0 Z5 ; Retract to safe height

M30 ; Program end`,

    circle: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection

; Circle Example
G0 Z5 ; Rapid to safe height
G0 X50 Y50 ; Rapid to center
G1 Z-2 F500 ; Plunge cut
G2 X50 Y50 I15 J0 F800 ; Cut full circle
G0 Z5 ; Retract to safe height

M30 ; Program end`,

    grid: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection

; Grid Pattern
G0 Z5 ; Rapid to safe height
G1 Z-1 F500 ; Plunge cut

; Horizontal lines
G0 X20 Y20
G1 X80 F1000
G0 X20 Y40
G1 X80
G0 X20 Y60
G1 X80
G0 X20 Y80
G1 X80

; Vertical lines
G0 X20 Y20
G1 Y80
G0 X40 Y20
G1 Y80
G0 X60 Y20
G1 Y80
G0 X80 Y20
G1 Y80

G0 Z5 ; Retract to safe height
M30 ; Program end`,

    spiral: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection

; Spiral Outwards
G0 Z5 ; Rapid to safe height
G0 X50 Y50 ; Rapid to center
G1 Z-2 F500 ; Plunge cut

; Spiral outwards with increasing radius
G2 X50 Y50 I1 J0 F800
G2 X50 Y50 I2 J0
G2 X50 Y50 I3 J0
G2 X50 Y50 I4 J0
G2 X50 Y50 I5 J0
G2 X50 Y50 I6 J0
G2 X50 Y50 I7 J0
G2 X50 Y50 I8 J0
G2 X50 Y50 I9 J0
G2 X50 Y50 I10 J0

G0 Z5 ; Retract to safe height
M30 ; Program end`,

    complex: `G21 ; Millimeter units
G90 ; Absolute positioning
G17 ; XY plane selection

; Complex Pattern Example
G0 Z5

; First square
G0 X30 Y30
G1 Z-1 F500
G1 X70 F1000
G1 Y70
G1 X30
G1 Y30
G0 Z5

; Circle in center
G0 X50 Y50
G1 Z-1.5 F500
G2 X50 Y50 I10 J0 F800
G0 Z5

; Diagonal lines
G0 X20 Y20
G1 Z-0.5 F500
G1 X80 Y80 F1000
G0 Z5
G0 X80 Y20
G1 Z-0.5 F500
G1 X20 Y80 F1000

G0 Z5
M30`
};

function loadGCodeExample(exampleName) {
    if (gcodeExamples[exampleName]) {
        document.getElementById('gcodeEditor').value = gcodeExamples[exampleName];
        if (simulator) {
            simulator.parseGCode(gcodeExamples[exampleName]);
        }
    }
}
