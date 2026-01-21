import { useState, useEffect } from 'react';

// API URL - Render backend
const API_URL = import.meta.env.PUBLIC_API_URL || 'https://yutubetomp4-online.onrender.com';

interface VideoFormat {
    formatId: string;
    quality: string;
    resolution?: string;
    height?: number;
    ext: string;
    filesize?: number;
    url?: string;
}

interface VideoInfo {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    durationString: string;
    channel: string;
    isLive?: boolean;
    formats: {
        video: VideoFormat[];
        audio: VideoFormat[];
    };
}

interface Props {
    lang?: string;
}

const translations: Record<string, Record<string, string>> = {
    en: {
        placeholder: 'Paste YouTube link here...',
        start: 'Start',
        processing: 'Analyzing Video...',
        coldStart: 'Waking up server (may take 30-50s)...',
        downloadMp3: 'Download MP3',
        downloadMp4: 'Download MP4',
        selectQuality: 'Select Quality',
        downloading: 'Preparing download...',
        error: 'Error occurred. Please try again.',
        tryAgain: 'Try Again',
        newVideo: 'New Video',
        liveVideo: 'LIVE',
    },
    es: {
        placeholder: 'Pega el enlace de YouTube aquí...',
        start: 'Iniciar',
        processing: 'Analizando Video...',
        coldStart: 'Despertando servidor (puede tardar 30-50s)...',
        downloadMp3: 'Descargar MP3',
        downloadMp4: 'Descargar MP4',
        selectQuality: 'Seleccionar Calidad',
        downloading: 'Preparando descarga...',
        error: 'Error ocurrido. Por favor intenta de nuevo.',
        tryAgain: 'Intentar de nuevo',
        newVideo: 'Nuevo Video',
        liveVideo: 'EN VIVO',
    },
    de: {
        placeholder: 'YouTube-Link hier einfügen...',
        start: 'Starten',
        processing: 'Video wird analysiert...',
        coldStart: 'Server wird gestartet (kann 30-50s dauern)...',
        downloadMp3: 'MP3 herunterladen',
        downloadMp4: 'MP4 herunterladen',
        selectQuality: 'Qualität wählen',
        downloading: 'Download vorbereiten...',
        error: 'Fehler aufgetreten. Bitte erneut versuchen.',
        tryAgain: 'Erneut versuchen',
        newVideo: 'Neues Video',
        liveVideo: 'LIVE',
    },
    fr: {
        placeholder: 'Collez le lien YouTube ici...',
        start: 'Démarrer',
        processing: 'Analyse de la vidéo...',
        coldStart: 'Réveil du serveur (peut prendre 30-50s)...',
        downloadMp3: 'Télécharger MP3',
        downloadMp4: 'Télécharger MP4',
        selectQuality: 'Choisir la qualité',
        downloading: 'Préparation du téléchargement...',
        error: 'Une erreur est survenue. Veuillez réessayer.',
        tryAgain: 'Réessayer',
        newVideo: 'Nouvelle Vidéo',
        liveVideo: 'EN DIRECT',
    },
    pt: {
        placeholder: 'Cole o link do YouTube aqui...',
        start: 'Iniciar',
        processing: 'Analisando Vídeo...',
        coldStart: 'Iniciando servidor (pode levar 30-50s)...',
        downloadMp3: 'Baixar MP3',
        downloadMp4: 'Baixar MP4',
        selectQuality: 'Selecionar Qualidade',
        downloading: 'Preparando download...',
        error: 'Erro ocorrido. Por favor, tente novamente.',
        tryAgain: 'Tentar novamente',
        newVideo: 'Novo Vídeo',
        liveVideo: 'AO VIVO',
    },
    ja: {
        placeholder: 'YouTubeリンクをここに貼り付け...',
        start: '開始',
        processing: '動画を分析中...',
        coldStart: 'サーバーを起動中（30〜50秒かかる場合があります）...',
        downloadMp3: 'MP3をダウンロード',
        downloadMp4: 'MP4をダウンロード',
        selectQuality: '品質を選択',
        downloading: 'ダウンロード準備中...',
        error: 'エラーが発生しました。もう一度お試しください。',
        tryAgain: '再試行',
        newVideo: '新しい動画',
        liveVideo: 'ライブ',
    },
    ko: {
        placeholder: 'YouTube 링크를 여기에 붙여넣기...',
        start: '시작',
        processing: '동영상 분석 중...',
        coldStart: '서버 시작 중 (30-50초 소요될 수 있음)...',
        downloadMp3: 'MP3 다운로드',
        downloadMp4: 'MP4 다운로드',
        selectQuality: '품질 선택',
        downloading: '다운로드 준비 중...',
        error: '오류가 발생했습니다. 다시 시도해 주세요.',
        tryAgain: '다시 시도',
        newVideo: '새 동영상',
        liveVideo: '라이브',
    },
    ar: {
        placeholder: 'الصق رابط YouTube هنا...',
        start: 'ابدأ',
        processing: 'جاري تحليل الفيديو...',
        coldStart: 'جاري تشغيل الخادم (قد يستغرق 30-50 ثانية)...',
        downloadMp3: 'تحميل MP3',
        downloadMp4: 'تحميل MP4',
        selectQuality: 'اختر الجودة',
        downloading: 'جاري تحضير التحميل...',
        error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
        tryAgain: 'حاول مرة أخرى',
        newVideo: 'فيديو جديد',
        liveVideo: 'مباشر',
    },
};

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ConverterWidget({ lang = 'en' }: Props) {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'downloading' | 'error'>('idle');
    const [error, setError] = useState('');
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [selectedQuality, setSelectedQuality] = useState<string>('');
    const [isColdStart, setIsColdStart] = useState(false);
    const [processingTime, setProcessingTime] = useState(0);

    const t = translations[lang] || translations.en;

    // Track processing time for cold start detection
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'processing') {
            interval = setInterval(() => {
                setProcessingTime(prev => {
                    // Show cold start message after 5 seconds
                    if (prev >= 5 && !isColdStart) {
                        setIsColdStart(true);
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            setProcessingTime(0);
            setIsColdStart(false);
        }
        return () => clearInterval(interval);
    }, [status]);

    const isValidYouTubeUrl = (url: string): boolean => {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
            /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/live\/[\w-]+/,
        ];
        return patterns.some(pattern => pattern.test(url));
    };

    const handleStart = async () => {
        if (!url) {
            setError('Please enter a YouTube URL');
            return;
        }

        if (!isValidYouTubeUrl(url)) {
            setError('Invalid YouTube URL. Please enter a valid YouTube video link.');
            setStatus('error');
            return;
        }

        setError('');
        setStatus('processing');
        setVideoInfo(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

            const response = await fetch(`${API_URL}/api/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || 'Failed to fetch video info');
            }

            const data = await response.json();
            setVideoInfo(data);
            setStatus('success');

            // Set default quality to best available
            if (data.formats?.video?.length > 0) {
                setSelectedQuality(data.formats.video[0].formatId);
            }
        } catch (err) {
            console.error('Error:', err);
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Request timed out. Please try again.');
            } else {
                setError(err instanceof Error ? err.message : t.error);
            }
            setStatus('error');
        }
    };

    const handleDownload = async (type: 'video' | 'audio') => {
        if (!videoInfo) return;

        setStatus('downloading');

        try {
            const response = await fetch(`${API_URL}/api/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    formatId: type === 'video' ? selectedQuality : undefined,
                    type,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to get download URL');
            }

            const data = await response.json();

            // Open download in new tab
            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            }

            setStatus('success');
        } catch (err) {
            console.error('Download error:', err);
            setError(err instanceof Error ? err.message : t.error);
            setStatus('error');
        }
    };

    const handleReset = () => {
        setStatus('idle');
        setUrl('');
        setError('');
        setVideoInfo(null);
        setSelectedQuality('');
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-brand-card/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 ring-1 ring-white/5 overflow-hidden relative">
            <div className="relative flex items-center p-2">
                {(status === 'idle' || status === 'error') && !videoInfo ? (
                    <>
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/30">
                                <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                if (error) setError('');
                                if (status === 'error') setStatus('idle');
                            }}
                            className={`block w-full rounded-xl bg-black/50 border-0 py-4 pl-12 pr-32 text-white placeholder:text-white/30 focus:ring-2 ${error ? 'focus:ring-red-500 ring-2 ring-red-500/50' : 'focus:ring-brand-red'} focus:outline-none sm:text-base sm:leading-6 transition-all duration-300`}
                            placeholder={t.placeholder}
                            aria-label="YouTube Video URL Input"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleStart();
                            }}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <button
                                type="button"
                                onClick={handleStart}
                                className="inline-flex items-center gap-x-2 rounded-lg bg-brand-red px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!url}
                                aria-label="Start Conversion"
                            >
                                {t.start}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </>
                ) : status === 'processing' ? (
                    <div className="w-full py-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div>
                            <p className="text-white font-medium">
                                {isColdStart ? t.coldStart : t.processing}
                            </p>
                            {isColdStart && (
                                <p className="text-white/40 text-xs mt-1">
                                    {processingTime}s elapsed
                                </p>
                            )}
                        </div>
                    </div>
                ) : status === 'downloading' ? (
                    <div className="w-full py-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-white font-medium">{t.downloading}</p>
                    </div>
                ) : videoInfo ? (
                    <div className="w-full py-3 px-2">
                        {/* Video Info */}
                        <div className="flex items-start gap-4 mb-4">
                            <div className="relative flex-shrink-0">
                                <img
                                    src={videoInfo.thumbnail}
                                    alt={videoInfo.title}
                                    className="w-32 h-20 object-cover rounded-lg"
                                    onError={(e) => {
                                        e.currentTarget.src = '/favicon.png';
                                    }}
                                />
                                {videoInfo.isLive && (
                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
                                        {t.liveVideo}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
                                    {videoInfo.title}
                                </h3>
                                <p className="text-white/50 text-xs">
                                    {videoInfo.channel}
                                    {videoInfo.duration && !videoInfo.isLive && (
                                        <> • {videoInfo.durationString || formatDuration(videoInfo.duration)}</>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="p-2 text-white/50 hover:text-white flex-shrink-0 hover:bg-white/10 rounded-lg transition-colors"
                                aria-label="Reset Converter"
                                title={t.newVideo}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                        </div>

                        {/* Quality Selector */}
                        {videoInfo.formats?.video?.length > 0 && (
                            <div className="mb-4">
                                <label className="text-white/60 text-xs mb-2 block">{t.selectQuality}</label>
                                <div className="flex flex-wrap gap-2">
                                    {videoInfo.formats.video.map((format) => (
                                        <button
                                            key={format.formatId}
                                            onClick={() => setSelectedQuality(format.formatId)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                selectedQuality === format.formatId
                                                    ? 'bg-brand-red text-white'
                                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                                            }`}
                                        >
                                            {format.quality || `${format.height}p`}
                                            {format.filesize && (
                                                <span className="ml-1 opacity-60">
                                                    ({formatFileSize(format.filesize)})
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Download Buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleDownload('audio')}
                                className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-sm text-white hover:bg-white/20 transition-colors font-medium flex items-center justify-center gap-2"
                                aria-label="Download MP3"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M10.5 3.75a.75.75 0 00-1.5 0v8.69L6.72 10.16a.75.75 0 00-1.06 1.06l4 4a.75.75 0 001.06 0l4-4a.75.75 0 10-1.06-1.06l-2.28 2.28V3.75z" />
                                    <path d="M3.5 14.25a.75.75 0 00-1.5 0v1.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75v-1.5a.75.75 0 00-1.5 0v1.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-1.5z" />
                                </svg>
                                {t.downloadMp3}
                            </button>
                            <button
                                onClick={() => handleDownload('video')}
                                className="flex-1 px-4 py-3 bg-brand-red rounded-xl text-sm text-white hover:bg-red-600 transition-colors shadow-lg shadow-brand-red/20 font-medium flex items-center justify-center gap-2"
                                aria-label="Download MP4"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M10.5 3.75a.75.75 0 00-1.5 0v8.69L6.72 10.16a.75.75 0 00-1.06 1.06l4 4a.75.75 0 001.06 0l4-4a.75.75 0 10-1.06-1.06l-2.28 2.28V3.75z" />
                                    <path d="M3.5 14.25a.75.75 0 00-1.5 0v1.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75v-1.5a.75.75 0 00-1.5 0v1.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-1.5z" />
                                </svg>
                                {t.downloadMp4}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
            {error && (
                <div className="px-4 pb-3 pt-1">
                    <div className="flex items-center justify-between">
                        <p className="text-red-400 text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <span className="line-clamp-1">{error}</span>
                        </p>
                        <button
                            onClick={handleStart}
                            className="ml-3 text-xs text-brand-red hover:text-red-400 font-medium flex-shrink-0"
                        >
                            {t.tryAgain}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
