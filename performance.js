
// Constants
var STD_PRESSURE = 1013; // hPa
var STD_HECTOPASCAL_HEIGHT = 27; // ft

// Flags
var useFL = false;
var usePavedRWY = true;
var useSoftSfc = false;
var useSnowCorrection = false;
var useSlope = false;
var useWindComponent = true;
var useIncreaedAppSpeed = true;
var useMSAROC = false;


// Global Inputs
var elevationInput,
    temperatureInput,
    pressureInput,
    windDirInput,
    windSpdInput,
    rwyDirInput,
    weightInput;

$(document).ready(function()
{
    $('#performanceForm input').on('change', function(e)
    {
        calculateFromInputs();
    });
});

function calculateFromInputs()
{
    elevationInput = parseInt($('#performanceForm input[name="elevationInput"]').val(), 10),
    temperatureInput = parseInt($('#performanceForm input[name="temperatureInput"]').val(), 10),
    pressureInput  = parseInt($('#performanceForm input[name="pressureInput"]').val(), 10),
    cruiseInput    = parseInt($('#performanceForm input[name="cruiseAltInput').val(), 10),
    msaInput       = parseInt($('#performanceForm input[name="msaInput').val(), 10),
    windDirInput   = parseInt($('#performanceForm input[name="windDirInput"]').val(), 10),
    windSpdInput   = parseInt($('#performanceForm input[name="windSpdInput"]').val(), 10),
    rwyDirInput    = parseInt($('#performanceForm input[name="rwyDirInput"]').val(), 10),
    weightInput    = window.acTotalMass;

    if (
        (isNaN(elevationInput)) ||
        (isNaN(temperatureInput)) ||
        (isNaN(pressureInput)) ||
        (isNaN(cruiseInput)) ||
        (isNaN(msaInput)) ||
        (isNaN(windDirInput)) ||
        (isNaN(windSpdInput)) ||
        (isNaN(rwyDirInput)) ||
        (weightInput == null)
    ) {

        var takeOffLandingUIPairs = [
            ['to-groundroll', null, 'm'],
            ['to-distance', null, 'm'],
            ['ldg-groundroll', null, 'm'],
            ['ldg-distance', null, 'm']
        ];
    
        updateUIValues(takeOffLandingUIPairs);

        return false;
    }

    // Temp ISA Deviation
    var tempIsaDeviation = temperatureInput - 15;

    // Calculate pressure altitude of AD elevation.
    var pressureElevation = elevationInput,
        pressureAltitude  = cruiseInput;

    if (pressureInput != STD_PRESSURE) {
        var pressureDiff = STD_PRESSURE - pressureInput;
        var distanceDiff = pressureDiff * STD_HECTOPASCAL_HEIGHT;

        pressureElevation = elevationInput + distanceDiff;

        // If we use FL we don't correct for pressure.
        if (!useFL) {
            pressureAltitude = cruiseInput + distanceDiff;
        } else {
            pressureAltitude = cruiseInput * 100;
        }

        console.log('PA', pressureAltitude);

        // Pressure Elevation must not be less than 0, no data in matrix below 0.
        if (pressureElevation < 0) {
            pressureElevation = 0;
        }
    }

    var data = calculateAll(pressureElevation, pressureAltitude, tempIsaDeviation, weightInput);
    console.log(data);

    var takeOffLandingUIPairs = [
        ['to-groundroll', Math.ceil(data.takeoff.groundroll), 'm'],
        ['to-distance', Math.ceil(data.takeoff.distance), 'm'],
        ['ldg-groundroll', Math.ceil(data.landing.groundroll), 'm'],
        ['ldg-distance', Math.ceil(data.landing.distance), 'm'],
        ['oei-serviceceil', ceilingCheck(Math.floor(data.OEIserviceCeiling)), 'ft'],
        ['oei-absceil', ceilingCheck(Math.floor(data.OEIabsoluteCeiling)), 'ft'],
        ['roc-vyse', Math.floor(data.rocVySe), 'fpm'],
        ['roc-vy', '---', 'fpm'],
        ['useMSAOrNotTxt', (useMSAROC ? pressureAltitude : pressureAltitude / 3 * 2), 'ft']
    ];

    updateUIValues(takeOffLandingUIPairs);
}

function ceilingCheck(value)
{
    if (value == 7001) {
        value = '> 7000';
    }
    return value;
}

function updateUIValues(dataset)
{
    for (var i in dataset) {
        var item    = dataset[i],
            element = $('.'+ item[0]),
            value   = item[1],
            suffix  = item[2];

        if (
            value === '' ||
            isNaN(value) ||
            value === null
        ) {
            value = '-';
        } else {
            value = value +' '+ suffix;
        }

        element.html(value);
    }
}

function getWindComponents()
{
    // Calculate HWC/TWC and XWC.
    var headwindComponent =  Math.cos(toRadians(windDirInput - rwyDirInput)) * windSpdInput;
    var crosswindComponent = Math.sin(toRadians(windDirInput - rwyDirInput)) * windSpdInput;

    if (isNaN(headwindComponent)) {
        headwindComponent = 0;
    }

    if (isNaN(crosswindComponent)) {
        crosswindComponent = 0;
    }

    return {
        'head': headwindComponent,
        'cross': crosswindComponent
    };
}


function toDegrees (angle) {
    return angle * (180 / Math.PI);
}

function toRadians (angle) {
    return angle * (Math.PI / 180);
}


// Functions for interpolation

function findKeysForInterpolation(needle, haystack)
{
    var sortedKeys = haystack.sort((a, b) => {
        return Math.abs(a - needle) - Math.abs(b - needle);
    });

    return [parseInt(sortedKeys[0], 10), parseInt(sortedKeys[1], 10)];
}

function findDataValuesInDataset(needle, dataset, keys)
{
    var interpolateKeys = findKeysForInterpolation(needle, keys);

    var keyOne = interpolateKeys[0],
        keyTwo = interpolateKeys[1],
        valueOne = dataset[keyOne],
        valueTwo = dataset[keyTwo];

    return [valueOne, valueTwo];
}

function interpolate1D(needle, dataset, keys)
{
    var interpolateKeys = findKeysForInterpolation(needle, keys);

    var keyOne = interpolateKeys[0],
        keyTwo = interpolateKeys[1],
        valueOne = dataset[keyOne],
        valueTwo = dataset[keyTwo];

    return (valueTwo - valueOne) / (keyTwo - keyOne) * (needle - keyOne) + valueOne;    
}

function interpolate2D()
{
    // TODO..
}

function interpolate3D(pressureAltitudeInput, degreeInput, massInput, matrixData)
{
    var massKeys = Object.keys(matrixData),
        massKeys2 = findKeysForInterpolation(massInput, massKeys),
        mass1 = massKeys2[0],
        mass2 = massKeys2[1];

    var degreeKeys = Object.keys(matrixData[mass1]),
        degreeKeys2 = findKeysForInterpolation(degreeInput, degreeKeys),
        degree1 = degreeKeys2[0],
        degree2 = degreeKeys2[1];

    var pressureAltitudeKeys = Object.keys(matrixData[mass1][degree1]),
        pressureAltitudeKeys2 = findKeysForInterpolation(pressureAltitudeInput / 1000, pressureAltitudeKeys),
        pressureAltitude1 = pressureAltitudeKeys2[0],
        pressureAltitude2 = pressureAltitudeKeys2[1];

    var pressureAltitudeKeys = [pressureAltitude1, pressureAltitude2];


    var interpolationData1D1 = {
        [degree1]: interpolate1D(pressureAltitudeInput / 1000, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / 1000, matrixData[mass1][degree2], pressureAltitudeKeys),
        
        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / 1000, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / 1000, matrixData[mass1][degree2], pressureAltitudeKeys)
    };

    var interpolationData1D2 = {
        [degree1]: interpolate1D(pressureAltitudeInput / 1000, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / 1000, matrixData[mass2][degree2], pressureAltitudeKeys),

        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / 1000, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / 1000, matrixData[mass2][degree2], pressureAltitudeKeys)
    };

    var interpolationData2D = {
        [mass1]: interpolate1D(degreeInput, interpolationData1D1, degreeKeys2),
        [mass2]: interpolate1D(degreeInput, interpolationData1D2, degreeKeys2),

        [mass1 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D1, degreeKeys2),
        [mass2 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2, degreeKeys2),
    };

    var interpolationData3D = {
        'result': interpolate1D(massInput, interpolationData2D, massKeys2),
        ['raw']: findDataValuesInDataset(massInput, interpolationData2D, massKeys2)
    }

    return {
        'result': interpolationData3D['result'],
        'data': {
            '1D1': interpolationData1D1,
            '1D2': interpolationData1D2,
            '2D': interpolationData2D,
            '3D': interpolationData3D
        }
    };
};


// Functions for specifics

function calculateTakeOffGroundRoll(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeOffGroundMatrix);
}

function calculateTakeOffDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,takeOffFiftyFtMatrix)
}

function calculateLandingGroundRoll(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingGroundMatrix)
}

function calculateLandingDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingFiftyFtMatrix)
}

function calculateVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxMatrix)
}

function calculateRocVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVxMatrix)
}

function calculateVySe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVySeMatrix)
}

// ROC @ 2/3PA (or MSA) with VySE speed.
function calculateRocVySe(pa, isaDeviation, tom, useTwoThirds) {
    var sfcTemp = isaDeviation + 15;
    var altitude = pa; // As per default, 2/3 PA is used for ROC calculations.

    if (useTwoThirds) {
        altitude = pa / 3 * 2;
    }

    if (useMSAROC) {
        altitude = msaInput;
    }
    // console.log(altitude);

    return interpolate3D(altitude, sfcTemp, tom, ROCVySeMatrix);
}

function calculateVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxSeMatrix)
}

function calculateRocVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVxSeMatrix)
}


function calculateOEIceiling(isaDeviation, tom) {
    var serviceCeiling = 7001;
    var fpm = 1;
    while (fpm < 50) {
        fpm = calculateRocVySe(serviceCeiling, isaDeviation, tom).result;
        
        if (fpm < 50) {
            serviceCeiling -= 1;
        }
    }
    
    return serviceCeiling;
}

function calculateOEIabsoluteCeiling(isaDeviation, tom) {
    var absoluteCeiling = 7001;
    var fpm = -1;
    while (fpm < 0) {
        fpm = calculateRocVySe(absoluteCeiling, isaDeviation, tom).result;
        
        if (fpm < 0) {
            absoluteCeiling -= 1;
        }
    }

    return absoluteCeiling;
}


function takeoffCorrectedCalculations(pa, isaDeviation, tom, slope)
{
    var groundroll = calculateTakeOffGroundRoll(pa, isaDeviation, tom);
    var distance = calculateTakeOffDist(pa, isaDeviation, tom);
    
    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents();
        if (windComponents.head > 0) {                            //If there is headwind
            windCorrection = windComponents.head * -2.5;         //Remove 2,5m per kt
        } else {                                                  //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 10;           //Add 10m per kt
        }    
    }
    

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.06             //Remove 6% of Groundroll
    }

    var slopeCorrection = 0;
    if (useSlope) {
        //Correction for Runway slope, according to AFM
        if (slope > 0) {
            slopeCorrection = slope / 0.01 * 0.05 * groundroll.result;  //Add 5% of groundroll per 1% upslope
        }    
    }
    

    //Correction for soft surface, according to GreyBird procedure
    var softSfcCorrection = 0;
    if (useSoftSfc) {                                       //If the surface is soft
        softSfcCorrection = groundroll.result * 0.25;               //Add 25% of groundroll
    }

    /*
    TODO - Add Corrections for:
    Water & Slush (cm)
    Wet snow (cm)
    Frozen snow (cm)
    */

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorretion': pavedRwyCorrection,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections) {                                 //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.25),   //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.25),       //Distance to 50ft in meters
        'corrections': corrections                              //List of all corrections applied
    };
}

function landingCorrectedCalculations(pa, isaDeviation, tom, slope) {
    var groundroll = calculateLandingGroundRoll(pa, isaDeviation, tom);
    var distance = calculateLandingDist(pa, isaDeviation, tom);

    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents()
        if (windComponents.head > 0) {                            //If there is headwind
            windCorrection = windComponents.head * -5;           //Remove 5m per kt
        }
        else {                                                  //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 11;           //Add 11m per kt
        }    
    }

    var appSpeedCorrection = 0
    //Correction for increased approach speed
    if (useIncreaedAppSpeed){
        appSpeedCorrection = 110                            //10 kts Increased approach speed calculated as tailwind of 10 kts
    }

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.02             //Remove 2% of Groundroll
    }

    var slopeCorrection = 0;
    if (useSlope) {
        //Correction for Runway slope, according to GreyBird Procedures
        if (slope < 0) {                                                //if there is downslope
            slopeCorrection = slope / 0.02 * 0.10 * groundroll.result;  //Add 10% of groundroll per 2% upslope
        } 
    }
    
    //Correction for soft surface or snow, according to GreyBird procedure
    var softSfcCorrection = 0;
    if (useSoftSfc || useSnowCorrection) {                  //If the surface is soft, or there is snow
        softSfcCorrection = groundroll.result * 0.25;               //Add 25% of groundroll
    }

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorretion': pavedRwyCorrection,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection,
        'appSpeedCorrection': appSpeedCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections){                                 //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.43),   //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.43),       //Distance from 50ft in meters
        'corrections': corrections                              //List of all corrections applied
    };
}

function calculateAll(pe, pa, isaDeviation, tom)
{
    return {
        'takeoff': takeoffCorrectedCalculations(pe, isaDeviation, tom, null),
        'landing': landingCorrectedCalculations(pe, isaDeviation, tom, null),

        'Vx': calculateVx(pa, isaDeviation, tom).result,
        'VySe': calculateVySe(pa, isaDeviation, tom).result,
        // 'rocVy': calculateRocVy(pa, isaDeviation, tom).result, // Why don't we have this??
        'rocVySe': calculateRocVySe(pa, isaDeviation, tom, true).result,
        'VxSe': calculateVxSe(pa, isaDeviation, tom).result,
        'rocVx': calculateRocVx(pa, isaDeviation, tom).result,
        'rocVxSe': calculateRocVxSe(pa, isaDeviation, tom).result,
        'OEIserviceCeiling': calculateOEIceiling(isaDeviation,tom),
        'OEIabsoluteCeiling': calculateOEIabsoluteCeiling(isaDeviation,tom)
    }
}

console.log(calculateAll(469,6000,0,1203))
