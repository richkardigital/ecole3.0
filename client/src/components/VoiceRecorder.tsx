import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
    onAudioReady: (file: File | null) => void;
}

const VoiceRecorder = ({ onAudioReady }: VoiceRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(stream);
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                const url = URL.createObjectURL(audioBlob);
                setAudioURL(url);
                
                // Create File object
                const file = new File([audioBlob], "voice-note.mp3", { type: "audio/mp3" });
                onAudioReady(file);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Impossible d'accéder au microphone. Veuillez vérifier vos permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }
    };

    const deleteRecording = () => {
        setAudioURL(null);
        onAudioReady(null);
        setRecordingTime(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    };
    
    useEffect(() => {
        if (audioRef.current) {
            const audio = audioRef.current;
            const handleEnded = () => setIsPlaying(false);
            const handlePause = () => setIsPlaying(false);
            const handlePlay = () => setIsPlaying(true);
            
            audio.addEventListener('ended', handleEnded);
            audio.addEventListener('pause', handlePause);
            audio.addEventListener('play', handlePlay);
            
            return () => {
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('pause', handlePause);
                audio.removeEventListener('play', handlePlay);
            };
        }
    }, [audioURL]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Note Vocale
            </h3>
            
            {!audioURL ? (
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                            isRecording 
                            ? 'bg-red-100 text-red-600 animate-pulse ring-4 ring-red-50' 
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                        title={isRecording ? "Arrêter l'enregistrement" : "Commencer l'enregistrement"}
                    >
                        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-6 h-6" />}
                    </button>
                    
                    {isRecording ? (
                        <div className="text-red-500 font-mono font-medium animate-pulse">
                            {formatTime(recordingTime)} • Enregistrement...
                        </div>
                    ) : (
                        <span className="text-sm text-gray-500 italic">Appuyez sur le micro pour enregistrer</span>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
                    <button
                        type="button"
                        onClick={togglePlayback}
                        className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shrink-0"
                    >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div className={`h-full bg-blue-500 w-full ${isPlaying ? 'animate-pulse' : ''}`}></div> 
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">{formatTime(recordingTime)}</p>
                    </div>

                    <button
                        type="button"
                        onClick={deleteRecording}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                        title="Supprimer et recommencer"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <audio 
                        ref={audioRef} 
                        src={audioURL} 
                        className="hidden" 
                    />
                </div>
            )}
        </div>
    );
};

export default VoiceRecorder;
