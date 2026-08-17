const select = require('./select');
const request = require('../request');
const { getManagedCacheStorage } = require('../cache');

const track = (info) => {
    // 第一步：搜索歌曲获取ID
    const searchUrl = 'https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=' + encodeURIComponent(info.name); // 添加URL编码
    
    return request('GET', searchUrl)
        .then((response) => response.json())
        .then((searchResult) => {
            // 处理搜索API返回的数据结构
            let songId;
            
            // 搜索API通常返回数组，取第一个结果的ID
            if (Array.isArray(searchResult) && searchResult.length > 0) {
                songId = searchResult[0].id;
            } else if (searchResult && typeof searchResult === 'object' && searchResult.id) {
                // 如果是单个对象，直接取ID
                songId = searchResult.id;
            } else {
                return Promise.reject(new Error('未找到歌曲或返回格式错误'));
            }

            if (!songId || songId <= 0) {
                return Promise.reject(new Error('无效的歌曲ID'));
            }

            return songId;
        })
        .then((id) => {
            // 音质选择逻辑优化
            const quality = select.ENABLE_FLAC ? '999' : '320';
            
            const url = 'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=' +
                       id;
                
            return request('GET', url);
        })
        .then((response) => response.json())
        .then((audioData) => {
            if (!audioData || typeof audioData !== 'object' || !audioData.url) {
                return Promise.reject(new Error('音频API返回格式错误或缺少URL'));
            }

            if (audioData.br <= 0) {
                return Promise.reject(new Error('无效的音频比特率'));
            }

            return audioData.url;
        })
        .catch((error) => {
            console.error('获取音频失败:', error.message);
            return Promise.reject(error);
        });
};

const cs = getManagedCacheStorage('provider/pyncmd');
const check = (info) => cs.cache(info, () => track(info));

module.exports = { check };
