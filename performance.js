
// Constants
var STD_PRESSURE = 1013; // hPa
var STD_HECTOPASCAL_HEIGHT = 27; // ft
var stdVy = 84
var stdVySe = 84
var stdVx = 72
var stdVxSe = 83

// Flags
var useFL = false;
var usePavedRWY = true;
var useSoftSfc = false;
var useSnowCorrection = false;
var useSlope = false;
var useWindComponent = true;
var useIncreaedAppSpeed = true;
var useMSAROC = false;
var useCalculatedClimbSpeedsInGradients = false;


// Global Inputs
var elevationInput,
    temperatureInput,
    pressureInput,
    windDirInput,
    windSpdInput,
    rwyDirInput,
    weightInput,
    cruiseInput,
    msaInput;

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

        pressureElevation = toPressureAltitude(elevationInput);

        // If we use FL we don't correct for pressure.
        if (!useFL) {
            pressureAltitude = toPressureAltitude(cruiseInput);
        } else {
            pressureAltitude = cruiseInput * 100;
        }

        console.log('PA', pressureAltitude);

        // Pressure Elevation must not be less than 0, no data in matrix below 0.
        if (pressureElevation < 0) {
            pressureElevation = 0;
        }
    }

    var data = calculateAll(pressureElevation, pressureAltitude, msaInput, tempIsaDeviation, weightInput);
    console.log(data);

    var temperatures = Object.keys(data.takeoff.uncorrectedGround.data['1D1']);

    var takeOffLandingUIPairs = [
        ['to-groundroll', Math.ceil(data.takeoff.groundroll), 'm'],
        ['to-distance', Math.ceil(data.takeoff.distance), 'm'],
        ['ldg-groundroll', Math.ceil(data.landing.groundroll), 'm'],
        ['ldg-distance', Math.ceil(data.landing.distance), 'm'],
        ['oei-serviceceil', ceilingCheck(data.OEIserviceCeiling), 'ft'],
        ['oei-absceil', ceilingCheck(data.OEIabsoluteCeiling), 'ft'],
        ['roc-vyse', Math.floor(data.rocVySe), 'fpm'],
        ['roc-vy', '---', 'fpm'],
        ['useMSAOrNotTxt', (useMSAROC ? 'MSA' : '2/3 cruise alt.'), ''],

        ['to-temp1', temperatures[0], '&deg;C'],
        ['to-temp2', temperatures[1], '&deg;C']
    ];

    updateUIValues(takeOffLandingUIPairs);
}

function ceilingCheck(ceiling)
{
    var output = Math.floor(ceiling.ceiling);

    if (ceiling.isTopOfData) {
        output = '> '+ ceiling.ceiling;
    }

    return output;
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
            (typeof value == 'number' && isNaN(value)) ||
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

function toTrueAltitude(pa) {
    return pa + ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT)
}

function toPressureAltitude(ta) {
    return ta - ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT)
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
    var largerThan = [],
        lessThan   = [];
        
    
    for (var i in haystack) {
        if (typeof haystack[i] == 'string' && haystack[i].toLowerCase() == 'spacing') {
            continue;
        }
        if (haystack[i] >= needle) {
            largerThan.push(parseInt(haystack[i], 10));
        } else {
            lessThan.push(parseInt(haystack[i], 10));
        }
    }

    // console.log([Math.min(...largerThan), Math.max(...lessThan)]);
    return [Math.min(...largerThan), Math.max(...lessThan)];
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
        pressureAltitudeKeys2 = findKeysForInterpolation(pressureAltitudeInput / matrixData.spacing, pressureAltitudeKeys),
        pressureAltitude1 = pressureAltitudeKeys2[0],
        pressureAltitude2 = pressureAltitudeKeys2[1];

    var pressureAltitudeKeys = [pressureAltitude1, pressureAltitude2];


    var interpolationData1D1 = {
        [degree1]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree2], pressureAltitudeKeys),
        
        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree2], pressureAltitudeKeys)
    };

    var interpolationData1D2 = {
        [degree1]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree2], pressureAltitudeKeys),

        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree2], pressureAltitudeKeys)
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

function calculateGradient(roc,gs){
    return roc / (gs / 60 * 6076)
}


// Functions for specifics

//Takeoff distances
function calculateTakeOffGroundRoll(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeOffGroundMatrix);
}

function calculateTakeOffDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,takeOffFiftyFtMatrix)
}

//Landing distances
function calculateLandingGroundRoll(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingGroundMatrix)
}

function calculateLandingDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingFiftyFtMatrix)
}

//Climb speeds
function calculateToVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffClimbVyMatrix)
}

function calculateToVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffClimbVxMatrix)
}

function calculateVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVyMatrix)
}

function calculateVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxMatrix)
}

function calculateVySe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVySeMatrix)
}

function calculateVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxSeMatrix)
}

//Rates of climb
function calculateToROCVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffROCVyMatrix)
}

function calculateToROCVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffROCVxMatrix)
}

function calculateRocVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVyMatrix)
}

function calculateRocVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVxMatrix)
}

function calculateRocVySe(pa, isaDeviation, tom, useTwoThirds) {
    var sfcTemp = isaDeviation + 15;
    var altitude = pa;

    if (useTwoThirds && !useMSAROC) {
        altitude = pa / 3 * 2;
    }

    return interpolate3D(altitude, sfcTemp, tom, ROCVySeMatrix);
}

function calculateRocVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVxSeMatrix)
}

//Gradients
function calculateToGradientVy(pa, isaDeviation, tom) {
    var ias = calculateToVy(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVy
    }
    var roc = calculateToROCVy(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateToGradientVx(pa, isaDeviation, tom) {
    var ias = calculateToVx(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVx
    }
    var roc = calculateToROCVx(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVy(pa, isaDeviation, tom) {
    var ias = calculateVy(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVy
    }
    var roc = calculateRocVy(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVx(pa, isaDeviation, tom) {
    var ias = calculateVx(pa, isaDeviation,tom) .result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVx
    }
    var roc = calculateRocVx(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVySe(pa, isaDeviation, tom) {
    var ias = calculateVySe(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVySe
    }
    var roc = calculateRocVy(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVxSe(pa, isaDeviation, tom) {
    var ias = calculateVxSe(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVxSe
    }
    var roc = calculateRocVx(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}


//Ceilings
function calculateOEIceiling(isaDeviation, tom) {
    var serviceCeiling = 7000;
    var fpm = 1;
    while (fpm < 50) {
        fpm = calculateRocVySe(serviceCeiling, isaDeviation, tom).result;
        
        if (fpm < 50) {
            serviceCeiling -= 1;
        }
    }

    var isTopOfData = (serviceCeiling == 7000)

    //convert pressure altitude to true altitude
    serviceCeiling = toTrueAltitude(serviceCeiling)
    
    return {
        'ceiling': serviceCeiling,
        'isTopOfData': isTopOfData
    };
}

function calculateOEIabsoluteCeiling(isaDeviation, tom) {
    var absoluteCeiling = 7000;
    var fpm = -1;
    while (fpm < 0) {
        fpm = calculateRocVySe(absoluteCeiling, isaDeviation, tom).result;
        
        if (fpm < 0) {
            absoluteCeiling -= 1;
        }
    }

    var isTopOfData = (absoluteCeiling == 7000)

    //convert pressure altitude to true altitude
    absoluteCeiling = toTrueAltitude(absoluteCeiling)

    return {
        'ceiling': absoluteCeiling,
        'isTopOfData': isTopOfData
    };
}

//Corrections
function takeoffCorrectedCalculations(pa, isaDeviation, tom, slope)
{
    var groundroll = calculateTakeOffGroundRoll(pa, isaDeviation, tom);
    var distance = calculateTakeOffDist(pa, isaDeviation, tom);
    
    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents();
        if (windComponents.head > 0) {                           //If there is headwind
            windCorrection = windComponents.head * -2.5;         //Remove 2,5m per kt
        } else {                                                 //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 10;    //Add 10m per kt
        }    
    }
    

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.06       //Remove 6% of Groundroll
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
        softSfcCorrection = groundroll.result * 0.25;       //Add 25% of groundroll
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
    for (var i in corrections) {            //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.25),   //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.25),       //Distance to 50ft in meters
        'corrections': corrections                                     //List of all corrections applied
    };
}

function landingCorrectedCalculations(pa, isaDeviation, tom, slope) {
    var groundroll = calculateLandingGroundRoll(pa, isaDeviation, tom);
    var distance = calculateLandingDist(pa, isaDeviation, tom);

    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents()
        if (windComponents.head > 0) {                          //If there is headwind
            windCorrection = windComponents.head * -5;          //Remove 5m per kt
        }
        else {                                                  //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 11;   //Add 11m per kt
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
        pavedRwyCorrection = groundroll.result * -0.02       //Remove 2% of Groundroll
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
        softSfcCorrection = groundroll.result * 0.25;       //Add 25% of groundroll
    }

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorretion': pavedRwyCorrection,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection,
        'appSpeedCorrection': appSpeedCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections){                 //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.43),    //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.43),        //Distance from 50ft in meters
        'corrections': corrections                                      //List of all corrections applied
    };
}

function calculateAll(pe, pa, msa, isaDeviation, tom)
{
    var rocAltitude = pa;
    if (useMSAROC) {
        rocAltitude = msa;
    }

    return {
        //Takeoff and landing distances
        'takeoff': takeoffCorrectedCalculations(pe, isaDeviation, tom, null),
        'landing': landingCorrectedCalculations(pe, isaDeviation, tom, null),

        //Climb performance numbers, all with max cont. power setting and gear up
        //Takeoff Vy (flaps takeoff)
        'toVy': calculateToVy(rocAltitude, isaDeviation, tom).result,
        'toRocVy': calculateToROCVy(rocAltitude, isaDeviation, tom).result,
        'toGradVy': calculateToGradientVy(rocAltitude, isaDeviation,tom),
        //Takeoff Vx (flaps takeoff)
        'toVx': calculateToVx(rocAltitude, isaDeviation, tom).result,
        'toRocVx': calculateToROCVx(rocAltitude, isaDeviation, tom).result,
        'toGradVx': calculateToGradientVx(rocAltitude, isaDeviation, tom),
        //Enroute Vy (flaps&gear up)
        'Vy': calculateVy(rocAltitude, isaDeviation,tom).result,
        'rocVy': calculateRocVy(rocAltitude, isaDeviation, tom).result,
        'gradVy': calculateGradientVy(rocAltitude, isaDeviation,tom),
        //Enroute Vx (flaps up)
        'Vx': calculateVx(rocAltitude, isaDeviation, tom).result,
        'rocVx': calculateRocVx(rocAltitude, isaDeviation, tom).result,
        'gradVx': calculateGradientVx(rocAltitude, isaDeviation,tom),
        //VySe (one engine inoperative, and feathered, flaps up)
        'VySe': calculateVySe(rocAltitude, isaDeviation, tom).result,
        'rocVySe': calculateRocVySe(rocAltitude, isaDeviation, tom, true).result,
        'gradVySe': calculateGradientVySe(rocAltitude,isaDeviation,tom),
        //VxSe (one engine inoperative, and feathered, flaps up)
        'VxSe': calculateVxSe(rocAltitude, isaDeviation, tom).result,
        'rocVxSe': calculateRocVxSe(rocAltitude, isaDeviation, tom).result,
        'gradVxSe': calculateGradientVxSe(rocAltitude, isaDeviation, tom),

        //Ceilings (one engine inoperative, and feathered, flaps up)
        'OEIserviceCeiling': calculateOEIceiling(isaDeviation,tom),
        'OEIabsoluteCeiling': calculateOEIabsoluteCeiling(isaDeviation,tom)
    };
}
