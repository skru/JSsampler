(function() {
    window.AudioContext = (function(){
        return  window.AudioContext || window.mozAudioContext;
    })();
    var audioContext = new AudioContext();
    var tuna = new Tuna(audioContext);
    var wavesurfer = Object.create(WaveSurfer);
    var wavesurfHeight = document.getElementById('display-wrapper').offsetHeight;
    var wavesurfer_options = {
        container: document.querySelector('#wave'),
        waveColor: '#f6a828',
        progressColor: 'white',
        cursorColor: '#f6a828',
        cursorWidth: '5',
        hideScrollbar: true,
        normalize: false,
        audioContext: audioContext,
        interact: false,
        height: wavesurfHeight
    }
    var looper = $('#looper');
    var mic = $('#mic');
    var micMute = $('#micMute');
    var micOn = true;

    var masterMerger = audioContext.createChannelMerger(2);
    var mediaStreamSource;
    var recorder;

    var masterVolume = audioContext.createGain();
    masterVolume.gain.value = 0;
    var splitter = audioContext.createChannelSplitter(2);
    var recordVolume = audioContext.createGain();
    recordVolume.gain.value = 1;

    var start = 0;
    var finish = 1;




    var initial = true;    //keeps track of initial state
    var playing = false;           //keeps track of playing state
    var recording = false; //keeps track of recording state

////disable options on init
    $('#slider-volume').slider({ disabled: true })


///////////////////////////////////////////////////////////
///////////// DELAY ///////////////////////////////////////
    var de = ['killer']
    var delay = new tuna.Delay();
    $('#delay-time').slider({
        value: 20,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.delayTime.value = ui.value/100;
        }

    });

    $('#delay-feed').slider({
        value: 70,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.feedback.value = ui.value/100;
        }
    });
    $('#delay-cutoff').slider({
        value: 100,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.cutoff.value = (ui.value/100) * 22050;
        }
    });
    $('#delay-wet').slider({
        value: 100,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.wetLevel.value = ui.value/100;
        }
    });
    $('#delay-dry').slider({
        value: 50,
        range: "min",
        animate: true,
        orientation: "vertical",
        slide: function( event, ui ) {
            delay.dryLevel.value = ui.value/100;
        }
    });
    delay.feedback.value = $('#delay-time').slider( "option", "value" )/100;
    delay.delayTime.value = $('#delay-feed').slider( "option", "value" )/100;
    delay.cutoff.value = ($('#delay-cutoff').slider( "option", "value" )/100) * 22050;
    delay.dryLevel.value = $('#delay-wet').slider( "option", "value" )/100;
    delay.wetLevel.value = $('#delay-dry').slider( "option", "value" )/100;
////////////////////////////////////////////////////////
///////////////////////////////////////////////////////
////PLAY
    $("#wave").click(function (e) {
        console.log('play')
        e.preventDefault();
        if (playing) {
            wavesurfer.seekTo(start);
            wavesurfer.play(start,finish * wavesurfer.getDuration());
            wavesurfer.on('finish', function () {
                wavesurfer.seekTo(start / wavesurfer.getDuration());
  
            });
        }
        wavesurfer.play(start, finish * wavesurfer.getDuration());
        playing = true;
    });
    wavesurfer.on('finish', function () {
        wavesurfer.stop();
        wavesurfer.seekTo(start / wavesurfer.getDuration());
        playing = false;

    });
    

////STOP
    $("#stop").click(function (e) {
        e.preventDefault();
        wavesurfer.stop();
        wavesurfer.seekTo(start / wavesurfer.getDuration());
        playing = false;
    });
////VOLUME
    $('#slider-volume').slider({
        value: 100,
        min: 0,
        max: 120,
        step: 0.1,
        range: "min",
        animate: true,
        slide: function( event, ui ) {
            masterVolume.gain.value = ui.value/100;
        }

    });
////PITCH
    $('#slider-pitch').slider({
        value: 1,
        min: 0,
        max: 2,
        step: 0.01,
        range: "min",
        animate: true,
        slide: function( event, ui ) {
            wavesurfer.setPlaybackRate(ui.value);
        }

    });
////RECORD
    $("#record").click(function (e) {
        e.preventDefault();
        recorder.clear();
        recorder.record();
        if (!initial) {

            wavesurfer.seekTo(start);
            wavesurfer.play(start,finish  * wavesurfer.getDuration());
        } else {
            
        }

        //playing = true;
        recording = true;
        //startRecorder(recorder);
        $("#record").hide();
        $('#recording').show();
    });

    $('#recording').hide();
    $('#recording').click(function (e) {
        e.preventDefault();
        stopRecorder(recorder);
        recording = false;
        $('#recording').hide();
        $("#record").show();
        if ($('#mic').is(':checked')) {
            $('#mic').prop('checked', false).trigger("change");
            $('#micbtn').css('background-color','#EFEFEF');
            masterVolume.gain.value = $('#slider-volume').slider( "option", "value" )/100; 
            $('#slider-volume').slider({ disabled: false });
        } else {

        }
       

    });
////LOOP BUTTON

    $('#looper').prop('checked', false).trigger("change");
    $('#looper:checkbox').change(function (e) {
        e.preventDefault();
        if (looper.is(':checked')) {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.play(start, finish * wavesurfer.getDuration()); 

            }); 
            $('#looperbtn').css('background-color','#f6a828');
        } else {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(start / wavesurfer.getDuration());
                playing = false;
            }); 
            $('#looperbtn').css('background-color','#EFEFEF');

        }
    });
////MICROPHONE
    mic.prop('checked', true);

    $('#micbtn').css('background-color','#f6a828');
    mic.change(function (e) {
        e.preventDefault();
        if (mic.is(':checked')) {
            mediaStreamSource.connect(masterMerger);
            $('#micbtn').css('background-color','#f6a828');
            if (micMute.is(':checked')) {
                masterVolume.gain.value = 0;
                 $('#slider-volume').slider({ disabled: true });
            };
        } else {
            mediaStreamSource.disconnect(masterMerger);
            $('#micbtn').css('background-color','#EFEFEF');
            if (micMute.is(':checked')) {
                masterVolume.gain.value = $('#slider-volume').slider( "option", "value" )/100; 
                $('#slider-volume').slider({ disabled: false });
            };
        };
    });
////MICROPHONE MUTE ON RECORD
    $('#micMute').prop('checked', true); 
    $('#micMutebtn').css('background-color','#f6a828'); 
    $('#micMute:checkbox').change(function (e) {
        e.preventDefault();
        if ($('#micMute').is(':checked')) {
            $('#micMutebtn').css('background-color','#f6a828'); 
        } else {
            $('#micMutebtn').css('background-color','#EFEFEF'); 
        };
    });  
////CLEAR
    $("#clear").click(function (e) {
        e.preventDefault();
        wavesurfer.destroy();
        mediaStreamSource.connect(recordVolume); 
        initial = true;
        $('#looper').prop('checked', false).trigger("change");
        //$('#delay').prop('checked', false).trigger("change");
        $('#micMute').prop('checked', true).trigger("change");
        $('#micbtn').css('background-color','#f6a828');
        $('#delaybtn').css('background-color','#EFEFEF');
        $('#clear').prop('disabled', true);
        $('#stop').prop('disabled', true);


///DELAY CHECKBOX        
    });
    $('#delay').prop('checked', false);
    $('#delay:checkbox').change(function (e) {
        console.log('kkk')
        e.preventDefault();
        if ($('#delay').is(':checked')) {
            masterMerger.disconnect(splitter)
            masterMerger.connect(delay.input);
            delay.connect(splitter);
            $('#delaybtn').css('background-color','#f6a828'); 
        } else {
            delay.disconnect(splitter);
            masterMerger.disconnect(delay.input);
            masterMerger.connect(splitter);
            $('#delaybtn').css('background-color','#EFEFEF'); 
        };
    });
////LOOP SCRUB
    $( "#slider-range" ).slider({
        range: true,
        min: 0,
        max: 1000,
        animate: true,
        values: [ 0, 1000 ],
        slide: function( event, ui ) {
            start = (ui.values[0] / 1000.0) * wavesurfer.getDuration();
            finish = (ui.values[1] / 1000.0);
            if (!playing) {
                wavesurfer.seekTo(ui.values[0] / 1000.0);
            }
        }
    });

//// Load  
    function renderImage(file) {
        var reader = new FileReader();
        reader.onload = function(event) {
            // if true does job of 'stopRecord' and inits 
            if ( $.isEmptyObject(wavesurfer.params) ) { //hack:returns true if wavesurfer not initiated
                mediaStreamSource.disconnect(recordVolume); // set in onSucces
                mediaStreamSource.connect(masterMerger);// to allow mic change event
                $('#mic').prop('checked', false).trigger("change");
                console.log('empty')
            } else {
                wavesurfer.destroy(); // clear wavesurfer
                 console.log('not empty')
            }
            wavesurfer.init(wavesurfer_options);         
            wavesurfer.loadBlob(file); // load file into wavesurfer
            wavesurfer.backend.setFilter(masterMerger); 
            wavesurfer.setVolume(0); //mutes ac.destination
            masterVolume.gain.value = 1; //maintains equal volume when recording?
            initial = false;

            masterMerger.connect(splitter);
            splitter.connect(masterVolume);
            masterVolume.connect(audioContext.destination);
            splitter.connect(recordVolume);   


        }
      reader.readAsDataURL(file);

    }
//// loading screen
    wavesurfer.on('loading', function (callback) {
        $('#canvas-wrapper').css('height','0');// hack: wavesurfer dissapears with .hide()
        $("#welcome-screen").hide()
        $("#loading-screen").show();
        $("#loading-screen").append(callback + '%')
        wavesurfer.on('ready', function (callback) {
            $("#loading-screen").hide()
            $('#canvas-wrapper').css('height','100%')

        });
    });

    // handle input changes
    $("#load").change(function() {
        // grab the first image in the FileList object and pass it to the function
        renderImage(this.files[0])
    });



////////

    var stopRecorder = function (recorder) {
        playing = false;
        recorder.stop();
        if (initial === true) {
            //mediaStreamSource.disconnect(recordVolume);
            mediaStreamSource.connect(masterMerger);// hack: allows for stopRecord to disconnect
            wavesurfer.init(wavesurfer_options);

            wavesurfer.backend.setFilter(masterMerger); 
            masterMerger.connect(splitter);
            splitter.connect(masterVolume);
            masterVolume.connect(audioContext.destination);
            splitter.connect(recordVolume);

            wavesurfer.setVolume(0); //mutes ac.destination
            masterVolume.gain.value = 5; //maintains equal volume when recording?
        } 
        mediaStreamSource.connect(masterMerger);
        initial = false;
        recorder.exportWAV(function (e) {
            wavesurfer.loadBlob(e);
            ////SAVE
            $("#save").click(function () {
                Recorder.forceDownload(e)
            })
        });
        finish = 1000;
        $("#slider-pitch").slider('value',1);
        wavesurfer.setPlaybackRate(1);
        //$("#slider-pitch").slider('value',1);
        wavesurfer.seekTo(0);
        start = 0;
        $('#mic').prop('checked', false).trigger("change");
        $( "#slider-range" ).slider('option', { values: [0, finish] })
        if ($('#delay').is(':checked')) {
            $('#delay').prop('checked', false).trigger("change");
        }

        $('#clear').prop('disabled', false);
        $('#stop').prop('disabled', false);
        



    };


    var onSuccess = function (stream) {
        $("canvas").css("display", "block");
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(recordVolume);
        recorder = new Recorder(recordVolume, {
            workerPath: "js/recorderWorker.js",
            bufferLen: 4096
        });
    };


// Gets microphone. inits with onSuccess
    navigator.getUserMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);
    var constraints = { 
        video: false,
        audio: true
    };
    if (navigator.getUserMedia) {
        navigator.getUserMedia (
        constraints,
        onSuccess,
        function (error) {
            $("body").text("Error: you need to allow var sample to use the microphone.",error)
        });
    };
})();
    







