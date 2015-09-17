(function() {
    window.AudioContext = (function(){
        return  window.AudioContext || window.mozAudioContext;
    })();
    var audioContext = new AudioContext();
    var wavesurfer = Object.create(WaveSurfer);
    var wavesurfHeight = document.getElementById('canvas-wrapper').offsetHeight;
    var wavesurfer_options = {
        container: document.querySelector('#wave'),
        waveColor: 'red',
        progressColor: 'white',
        cursorColor: 'red',
        cursorWidth: '5',
        hideScrollbar: true,
        normalize: false,
        audioContext: audioContext,
        interact: false,
        height: (wavesurfHeight)
    }
    var looper = $('#looper');
    var mic = $('#mic');
    var micMute = $('#micMute');

    var masterMerger = audioContext.createChannelMerger(2);
    var mediaStreamSource;
    var recorder;

    var masterVolume = audioContext.createGain();
    masterVolume.gain.value = 0;
    var splitter = audioContext.createChannelSplitter(2);
    var recordVolume = audioContext.createGain();
    recordVolume.gain.value = 1;

    




    var initial = true;    //keeps track of initial state
    var playing;           //keeps track of playing state
    var recording = false; //keeps track of recording state

///////////////////////////////////////////////////////////
///////////// DELAY ///////////////////////////////////////
    var delay_time = document.getElementById('dub-time');
    var delay_feedback = document.getElementById('dub-feedback');
    var delay_filter = document.getElementById('dub-filter');
    var delay_mix = document.getElementById('dub-mix');
    var delay_mixwet = document.getElementById('dub-mixwet');
    //console.log(delay_feedback.value)
    var tuna = new Tuna(audioContext);
    var delay = new tuna.Delay({
        feedback: delay_feedback.value,    //0 to 1+
        delayTime: delay_time.value,    //how many milliseconds should the wet signal be delayed?
        wetLevel: delay_mixwet.value,    //0 to 1+
        dryLevel: delay_mix.value,       //0 to 1+
        cutoff: delay_filter.value,        //cutoff frequency of the built in highpass-filter. 20 to 22050
        bypass: 0
    });
    var dub_delay = document.getElementById('dub-delay');
    delay.delayTime.value = delay_time.value;
    delay.feedback.value = delay_feedback.value;
    delay.cutoff.value = delay_filter.value;
    delay.dryLevel.value = delay_mix.value;
    delay.wetLevel.value = delay_mixwet.value;



    

    delay_time.addEventListener('input', function () {
        delay.delayTime.value = delay_time.value;
    }, true);
    delay_feedback.addEventListener('input', function () {
        delay.feedback.value = delay_feedback.value;
    }, true);
    delay_filter.addEventListener('input', function () {
        delay.cutoff.value = delay_filter.value;
    }, true);
    delay_mix.addEventListener('input', function () {
        delay.dryLevel.value = delay_mix.value;
        //console.log("mix")
    }, true);
    delay_mixwet.addEventListener('input', function () {
        delay.wetLevel.value = delay_mixwet.value;
        //console.log("mix")
    }, true);
////////////////////////////////////////////////////////
///////////////////////////////////////////////////////

    $("#wave").click(function (e) {
        e.preventDefault();
        if (playing) {
            wavesurfer.seekTo(scrub.val());
            wavesurfer.play();
        }
        wavesurfer.play();
        playing = true;
    });

    $("#stop").click(function (e) {
        e.preventDefault();
        wavesurfer.stop()
        wavesurfer.seekTo(scrub.val());
    });

    var volume = $('#volume');
    volume.hide(); 
    volume.on('input', function (e) {
        e.preventDefault();
        masterVolume.gain.value = volume.val();
        ////
    });

    var pitch = $('#pitch');
    pitch.on('input', function (e) {
        e.preventDefault();
        wavesurfer.setPlaybackRate(pitch.val());
    });

    var scrub = $('#scrub');
    scrub.val(0);
    scrub.on('input', function (e) {
        e.preventDefault();
        wavesurfer.seekTo(scrub.val());
    });

    $("div#record").click(function (e) {
        e.preventDefault();
        recording = true;
        startRecorder(recorder);
        $("div#record").hide();
        $('#recording').show();
    });

    $('div#recording').hide();
    $('div#recording').click(function (e) {
        e.preventDefault();
        stopRecorder(recorder);
        recording = false;
        $('div#recording').hide();
        $("div#record").show();

    });

    $('#looper').prop('checked', false);

    $('#looper:checkbox').change(function (e) {
        e.preventDefault();
        if (looper.is(':checked') === false) {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(scrub.val());
                playing = false;
            }); 
        } else {
            wavesurfer.on('finish', function () {
                wavesurfer.stop();
                wavesurfer.seekTo(scrub.val());
                wavesurfer.play()
            });
        }
    });

    $('#mic').prop('checked', true);
    $('#mic:checkbox').change(function (e) {
        e.preventDefault();
        if (mic.is(':checked') === false) {
            mediaStreamSource.disconnect(masterMerger);
            if (micMute.is(':checked')) {
                masterVolume.gain.value = 5; 
                volume.val(5); 
            };
        } else {
            mediaStreamSource.connect(masterMerger);
             if (micMute.is(':checked')) {
                masterVolume.gain.value = 0; 
                volume.val(0); 
            };
        };
    });

    $('#delay').prop('checked', false);
    $('#delay:checkbox').change(function (e) {
        e.preventDefault();
        if ($('#delay').is(':checked')) {
            masterMerger.disconnect(splitter)
            masterMerger.connect(delay.input);
            delay.connect(splitter);
        } else {
            delay.disconnect(splitter);
            masterMerger.disconnect(delay.input);
            masterMerger.connect(splitter);
        };
    });

    var startRecorder = function (recorder) {
        recorder.clear();
        recorder.record();
        if (!initial) {
            wavesurfer.play();
        }
        playing = true;
    };
    var stopRecorder = function (recorder) {
        playing = false;
        recorder.stop();
        if (initial === true) {
            mediaStreamSource.disconnect(recordVolume);

            wavesurfer.init(wavesurfer_options);
            wavesurfer.backend.setFilter(masterMerger); 
            wavesurfer.setVolume(0); 
            masterVolume.gain.value = 5; //maintains equal volume when recording?
            volume.val(5); 
            volume.show();
            console.log(recorder.source) 
            //recorder.source = outputMixer;
            console.log(recorder.source)

            masterMerger.connect(splitter);
            splitter.connect(masterVolume);
            masterVolume.connect(audioContext.destination);
            splitter.connect(recordVolume);
        } 
        initial = false;
        recorder.exportWAV(function (e) {
            wavesurfer.loadBlob(e);
        });
        //console.log($('#mic').val())
        $('#mic').prop('checked', false);
        //console.log($('#mic').val())
        wavesurfer.setPlaybackRate(1);
        wavesurfer.seekTo(0);
        scrub.val(0);
    };



    var onSuccess = function (stream) {
        $("canvas").css("display", "block");
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(recordVolume);
        recorder = new Recorder(recordVolume, {
            workerPath: "js/recorderWorker.js"
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
    







