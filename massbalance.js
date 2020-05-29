window.acTotalMass = null;


$(document).ready(function()
{

    // Set variables
    var diagram = document.querySelector('#diagram'),
        context = diagram.getContext('2d');

    var diagramImageUrl = './diagram.png';

    var scaleInput = document.querySelector('#scale'),
        scale      = parseFloat(scaleInput.value),
        scaleIndicator = document.querySelectorAll('.scaleIndicator');

    var form = document.querySelector('#massForm'),
        masses = [];

    var acLoader = form.querySelector('#acSelect');

    var downloadLinks = document.querySelectorAll('.downloadAsImage');
    var hiddenLink = document.querySelector('#link');


    // Events

    form.querySelectorAll('input[type="number"]').forEach((element) => {
        masses[element.id] = 0.0;
        element.addEventListener('change', triggerUpdate, false);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        triggerUpdate();
    });

    scaleInput.addEventListener('change', triggerUpdate, false);

    downloadLinks.forEach((link) => {
        link.addEventListener('click', saveImage, false);
    });

    acLoader.addEventListener('change', updateAc, false);

    if (window.innerWidth < 1200) {
        scaleInput.value = 0.65;
        triggerUpdate();
    }


    // Methods

    function triggerUpdate(event)
    {
        scale = parseFloat(scaleInput.value);
        
        for(var x in scaleIndicator) {
            scaleIndicator[x].innerHTML = scale;
        }

        var acMass = 0;
        form.querySelectorAll('input[type="number"]').forEach((element) => {
            masses[element.id] = element.value;

            if (element.id == 'acMass' || element.id == 'emptyMassMoment') return;
            acMass += element.value == '' ? 0.0 : parseFloat(element.value);
        });

        masses['acMass'] = Math.ceil(acMass);
        form.querySelector('#acMass').value = Math.ceil(acMass);
        window.acTotalMass = acMass;
        
        drawBackground();
    }

    function updateAc(event)
    {
        var reg = event.target.value;
        if (!preloadedAircrafts.hasOwnProperty(reg)) {
            return;
        }

        for(var i in preloadedAircrafts[reg]) {
            form.querySelector('#'+i).value = preloadedAircrafts[reg][i];
        }
        triggerUpdate();
    }

    function drawBackground()
    {
        var image = new Image();
        image.src = diagramImageUrl;
        image.onload = function() {
            diagram.width = this.naturalWidth * scale;
            diagram.height = this.naturalHeight * scale;
            context.drawImage(image, 0, 0, this.width * scale, this.height * scale);

            calculateMassPositions();
        };
    }

    function drawStroke(strokeCoordinates, color, dashed)
    {
        context.beginPath();

        if (typeof color == typeof undefined) {
            color = '#0000FF';
        }

        context.setLineDash([]);
        if (dashed === true) {
            context.setLineDash([10, 5]);
        }

        context.lineWidth = 2;
        context.moveTo(strokeCoordinates[0] * scale, strokeCoordinates[1] * scale);
        context.lineTo(strokeCoordinates[2] * scale, strokeCoordinates[3] * scale);
        context.strokeStyle = color;
        context.stroke();
        context.closePath();
    }

    function drawArc(arcCoordinates, radius, color)
    {
        if (typeof color == typeof undefined) {
            color = '#0000FF';
        }

        context.beginPath();
        // context.moveTo(arcCoordinates[0] * scale, arcCoordinates[1] * scale);
        context.arc(arcCoordinates[0] * scale, arcCoordinates[1] * scale, radius, 0, 2 * Math.PI);
        context.lineWidth = 2;
        context.strokeStyle = color;
        context.stroke();
        context.closePath();
    }

    function drawNumber(textCoordinates, color, text)
    {
        context.font = '20px Verdana';
        context.fillStyle = color;
        context.fillText(text, textCoordinates[0] * scale, textCoordinates[1] * scale);
    }

    function calculateMassPositions()
    {
        if (masses['emptyMass'] == '' || masses['pilotMass'] == '') {
            return;
        }

        // Pilot PX Range: 175 - 494 = 319px  /  Vertical: +355px  /  VRange: 135 - 788 = 653px
        // Pax PX Range: 505 - 824 = 319px  /  Vertical: -44px
        // Fuel PX Range: 834 - 1052 = 218px  /  Vertical: -205px
        // Baggage PX Range: 1068 - 1185 = 117px  /  Vertical: -176px
        // CG Limit PX Range: 1220 - 1423 = 203px  /  Vertical: 0px

        // The point at which the last drawn line stopped.
        var exitPoint = [];
        
        exitPoint = calculateAndDrawEmptyMassAndPilot();
        exitPoint = calculateAndDrawPax(exitPoint);
        exitPoint = calculateAndDrawFuel(exitPoint);
        exitPoint = calculateAndDrawBaggage(exitPoint);
        calculateAndDrawCG(exitPoint);
    }

    function calculateAndDrawEmptyMassAndPilot()
    {
        var emptyMassY = (500 - masses['emptyMassMoment']) * (653/360) + 135;
        var emptyMassCoordinates = [175, emptyMassY, 494, emptyMassY + 355];
        
        var emptyMassX = masses['pilotMass'] * (319/220) + 175;
        var pilotMass = [emptyMassX, emptyMassY+355, emptyMassX, emptyMassY+200];
        

        var intersection = checkLineIntersection(
            ...emptyMassCoordinates,
            ...pilotMass
        );

        // Slope
        drawStroke([175, emptyMassY, intersection.x, intersection.y]);
        
        // Rest
        drawStroke([intersection.x, intersection.y, 494, intersection.y]);
        
        // Dashed line from mass to intersection.
        drawStroke([emptyMassX, intersection.y, emptyMassX, 795], '#000000', true);
        //drawNumber([emptyMassX, 865], '#000000', masses['pilotMass'] + ' KG');

        return { x: 494, y: intersection.y };
    }
    
    function calculateAndDrawPax(exitPoint)
    {
        var paxY = exitPoint.y - 44;
        var YCoordinates = [505, exitPoint.y, 824, paxY];

        var paxX = masses['paxMass'] * (319/220) + 505;
        var XCoordinates = [paxX, 135, paxX, 788];
        
        var intersection = checkLineIntersection(
            ...YCoordinates,
            ...XCoordinates
        );

        // Slope
        drawStroke([YCoordinates[0], exitPoint.y, intersection.x, intersection.y]);

        // Rest
        drawStroke([intersection.x, intersection.y, 824, intersection.y]);

        if (masses['paxMass'] > 0) {
            // Dashed line
            drawStroke([intersection.x, intersection.y, intersection.x, 795], '#000000', true);
            //drawNumber([intersection.x, 865], '#000000', masses['paxMass'] + ' KG');
        }

        return { x: 824, y: intersection.y };
    }

    function calculateAndDrawFuel(exitPoint)
    {
        var fuelY = exitPoint.y - 205;
        var YCoordinates = [834, exitPoint.y, 1052, fuelY];

        var fuelX = masses['fuelMass'] * (218/150) + 834;
        var XCoordinates = [fuelX, 135, fuelX, 788];

        var intersection = checkLineIntersection(
            ...YCoordinates,
            ...XCoordinates
        );

        // Slope
        var fuelSlope = [YCoordinates[0], exitPoint.y, intersection.x, intersection.y];
        drawStroke(fuelSlope);

        // Rest
        drawStroke([intersection.x, intersection.y, 1052, intersection.y]);

        if (masses['fuelMass'] > 0) {
            // Dashed line
            drawStroke([intersection.x, intersection.y, intersection.x, 795], '#000000', true);
            //drawNumber([intersection.x, 865], '#000000', masses['fuelMass'] + ' KG');

            // No fuel line
            drawStroke([YCoordinates[0], exitPoint.y, 1052, exitPoint.y], '#FF0000');
        }

        return { x: 1052, y: intersection.y, noFuel: exitPoint, fuelSlope: fuelSlope };
    }

    function calculateAndDrawBaggage(exitPoint)
    {
        var bagY = exitPoint.y - 176;
        var YCoordinates = [1068, exitPoint.y, 1185, bagY];
        
        var bagX = masses['baggageMass'] * (117/80) + 1068;
        var XCoordinates = [bagX, 135, bagX, 788];

        var intersection = checkLineIntersection(
            ...YCoordinates,
            ...XCoordinates
        );

        var diffY = exitPoint.noFuel.y - exitPoint.y,
            noFuelIntersectionY = intersection.y + diffY;


        // Slope
        drawStroke([YCoordinates[0], exitPoint.y, intersection.x, intersection.y]);

        // Rest
        drawStroke([intersection.x, intersection.y, 1185, intersection.y]);

        if (masses['baggageMass'] > 0) {
            // Dashed line
            drawStroke([intersection.x, intersection.y, intersection.x, 795], '#000000', true);
            //drawNumber([intersection.x + 30, 865], '#000000', masses['baggageMass'] + ' KG');

            if (masses['fuelMass'] > 0) {
                // Slope
                drawStroke([YCoordinates[0], exitPoint.noFuel.y, intersection.x, noFuelIntersectionY], '#FF0000');

                // Rest
                drawStroke([intersection.x, noFuelIntersectionY, 1185, noFuelIntersectionY], '#FF0000');
            }
        } else {
            // Rest
            drawStroke([YCoordinates[0], exitPoint.noFuel.y, 1185, exitPoint.noFuel.y], '#FF0000');
            noFuelIntersectionY = exitPoint.noFuel.y;
        }

        return {
            x: 1185,
            y: intersection.y,
            intersectionX: intersection.x,
            noFuel: { y: noFuelIntersectionY },
            fuel: exitPoint
        };
    }

    function calculateAndDrawCG(exitPoint)
    {
        var CGX = (masses['acMass'] - 900) * (203/350) + 1220;
        // Normal line
        drawStroke([1220, exitPoint.y, CGX, exitPoint.y]);
        drawArc([CGX, exitPoint.y], 10);

        // Dashed line to show mass
        drawStroke([CGX, exitPoint.y, CGX, 795], '#333333', true);
        drawNumber([CGX - 100, 865], '#333333', masses['acMass'] +' KG');


        if (masses['fuelMass'] <= 0) {
            return;
        }

        // No fuel
        var noFuelX = (masses['acMass'] - 900 - masses['fuelMass']) * (203/350) + 1220;
        drawStroke([1220, exitPoint.noFuel.y, noFuelX, exitPoint.noFuel.y], '#FF0000');
        drawArc([noFuelX, exitPoint.noFuel.y], 10, '#FF0000');

        // Line between the two C.G points.
        var CGMovementCoordinates = [CGX, exitPoint.y, noFuelX, exitPoint.noFuel.y];
        drawStroke(CGMovementCoordinates, '#333333');

        // C.G Limits
        var FWDLimit = [1220, 692, 1423, 555],
            AFTLimit = [1220, 363, 1423, 99];

        // Can be drawn for visual references, however they aren't needed.
        // drawStroke(FWDLimit, '#795548');
        // drawStroke(AFTLimit, '#795548');

        // Intersection of CG movement and CG FWD limit.
        var badCGIntersection = checkLineIntersection(
            ...CGMovementCoordinates,
            ...FWDLimit
        );


        if (badCGIntersection.onLine1 && badCGIntersection.onLine2) {
            drawStroke([badCGIntersection.x, badCGIntersection.y, 1220, badCGIntersection.y], '#FF9800');
            drawArc([badCGIntersection.x, badCGIntersection.y], 10, '#FF9800');
            
            // Baggage
            var baggageSlopeY = exitPoint.fuel.y - exitPoint.y + badCGIntersection.y;
            drawStroke([1185, badCGIntersection.y, exitPoint.intersectionX, badCGIntersection.y], '#FF9800');
            drawStroke([exitPoint.intersectionX, badCGIntersection.y, 1068, baggageSlopeY], '#FF9800');

            // Fuel
            var safeCGFuelLine = [1052, baggageSlopeY, 834, baggageSlopeY]
            
            var safeCGFuelIntersection = checkLineIntersection(
                ...exitPoint.fuel.fuelSlope,
                ...safeCGFuelLine
            );

            // Straight line towards fuel slope.
            drawStroke([safeCGFuelLine[0], safeCGFuelLine[1], safeCGFuelIntersection.x, safeCGFuelLine[3]], '#FF9800');
            // drawStroke(exitPoint.fuel.fuelSlope, '#00FFCC');

            // Dashed line from fuel slope intersection down.
            drawStroke([safeCGFuelIntersection.x, safeCGFuelIntersection.y, safeCGFuelIntersection.x, 795], '#FF9800', true);
            
            var safeFuelAmountX = safeCGFuelIntersection.x - 834;
            var safeFuelMass =safeFuelAmountX / (218/150);
            
            drawNumber([safeCGFuelIntersection.x, 865], '#FF9800', parseInt(safeFuelMass) + ' KG');
        }
    }

    function saveImage()
    {
        var time = new Date();
        var minutes = time.getUTCMinutes() < 10 ? '0'+ time.getUTCMinutes() : time.getUTCMinutes();
        var timeString = time.getFullYear() +'-'+ time.getMonth() +'-'+ time.getDay() +' '+ time.getUTCHours() + minutes +'z';

        var oldScale = scale;

        // Set scale to 1 to get full size download.
        scaleInput.value = 1.0;
        triggerUpdate();

        setTimeout(() => {
            hiddenLink.setAttribute('download', timeString +'.png');
            hiddenLink.setAttribute('href', diagram.toDataURL('image/png') /*.replace('image/png', 'image/octet-stream')*/ );
            hiddenLink.click();

            // Scale the UI back to the user preference.
            scaleInput.value = oldScale;
            triggerUpdate();
        }, 200);
    }

    function renderPrintableLoadSheet()
    {
        var printLoadsheetImage = document.querySelectorAll('.print-loadsheet-image')[0];

        // Set scale to 1 to get full size download.
        var oldScale = scale;
        scaleInput.value = 1.0;

        setTimeout(function() {
            printLoadsheetImage.setAttribute('src', diagram.toDataURL('image/png'));

            // Scale the UI back to the user preference.
            scaleInput.value = oldScale;
        }.bind(this), 200);
    }
    window.renderPrintableLoadSheet = renderPrintableLoadSheet;

    // Trigger draw
    triggerUpdate();

});


var preloadedAircrafts = {
    'OY-JME': {
        'emptyMass': 878,
        'emptyMassMoment': 368.06
    },
    'OY-JEM': {
        'emptyMass': 886.8,
        'emptyMassMoment': 402.12
    },
    'OY-GBC': {
        'emptyMass': 874.9,
        'emptyMassMoment': 385.26
    },
    'SE-MGB (OY-GBF)': {
        'emptyMass': 855,
        'emptyMassMoment': 340.48
    }
}



// http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};