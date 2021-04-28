const BASE_URL = 'https://api.harvardartmuseums.org';
const KEY = 'apikey=5d1787c6-8637-435d-bdee-0dd3d9af0b90';
let incompleteResults = false;

async function fetchObjects() {
   const url = `${ BASE_URL }/object?${ KEY }`;
   
   onFetchStart();
   try {
     const response = await fetch(url);
     const data = await response.json();
     return data;
   } catch (error) {
      console.error(error);
   } finally {
      onFetchEnd();
   }
}

async function fetchAllCenturies() {
  const url = `${ BASE_URL }/century?${ KEY }&size=100&sort=temporalorder`;

  onFetchStart();
  if (localStorage.getItem('centuries')) { 
   return JSON.parse(localStorage.getItem('centuries'));
  }
  try { 
   const response = await fetch(url);
   const data = await response.json();
   const records = data.records;
   localStorage.setItem('centuries', JSON.stringify(records))
   return records;
  } catch (error) {
      console.error(error);
  } finally {
      onFetchEnd();
  }
}
fetchAllCenturies()

async function fetchAllClassifications () { 
  const url = `${ BASE_URL }/classification?${ KEY }&size=100&sort=name`;
  onFetchStart();
  if (localStorage.getItem('classification')) {
   return JSON.parse(localStorage.getItem('classification'));
}
  try {
   const response = await fetch(url);
   const data = await response.json();
   const records = data.records;
   localStorage.setItem('classification', JSON.stringify(records))
   return records;
   } catch (error) {
      console.error(error);
   } finally {
      onFetchEnd();
  }
}

async function prefetchCategoryLists() {
   onFetchStart();
   try {
     const [
       classifications, centuries
      ] = await Promise.all([
       fetchAllClassifications(),
       fetchAllCenturies()
      ]);

      $('.classification-count').text(`(${ classifications.length })`);
      classifications.forEach(classification => {
         $('#select-classification').append(`<option value="${classification.name}">${classification.name}</option>`)
      });

      $('.century-count').text(`(${ centuries.length })`);
      centuries.forEach(century => {
         $('#select-century').append(`<option value="${century.name}">${century.name}</option>`)
      });
   } catch (error) {
      console.error(error);
   } finally {
      onFetchEnd();
   }
}
prefetchCategoryLists();

function buildSearchString () {
   const selClass = $('#select-classification').val();
   const selCent = $('#select-century').val();
   const selKeyword = $('#keywords').val();
   const url = `${ BASE_URL }/object?${ KEY }&classification=${selClass}&century=${selCent}&keyword=${selKeyword}`;
   return url
}

$('#search').on('submit', async function (event) {
   event.preventDefault()
   onFetchStart();
   try {
     const URL = encodeURI(buildSearchString()); 
     const response = await fetch(URL);
     const data = await response.json();
     updatePreview(data.records, data.info)
     $('.bad-div').hide();
   } catch (error) {
      console.log(error)
   } finally {
      if (!incompleteResults) {
         $('.bad-div').hide();
      } else $('.bad-div').show();
      onFetchEnd();
   }
});

function onFetchStart() {
   $('#loading').addClass('active');
}

function onFetchEnd() {
   $('#loading').removeClass('active');
}

function renderPreview(record) {
   let brokenLink = 'bad-div'
   if (record.primaryimageurl && record.title && record.description !== undefined) {
      brokenLink = ''
   }
      let recordDiv = $(`
         <div class="object-preview ${brokenLink}">
            <a href="#">
            ${record.primaryimageurl === undefined ? '' : `<img src="${record.primaryimageurl}"/>`}
               <h3 style="margin-bottom: 1px; padding-bottom: 5px; border-bottom: 2px dashed grey">${record.title}</h3>
               <h3>${record.description}</h3>
            </a>
         </div>
      `)
      recordDiv.data('record', record)
      return recordDiv
}
 
function updatePreview(records, info) {
   $('.results').empty();
   if (info.next !== undefined) {
      $('.next').data('url', info.next)
      $('.next').attr('disabled', false)
   } else {
      $('.next').data('url', null)
      $('.next').attr('disabled', true)
   }

   if(info.prev !== undefined) {
      $('.previous').data('url', info.prev)
      $('.previous').attr('disabled', false)
   } else {
      $('.previous').data('url', null)
      $('.previous').attr('disabled', true)
   }

   records.forEach(record => {
      $(renderPreview(record)).appendTo('.results')
   });
}

$('#preview .next, #preview .previous').on('click', async function () {
  const URL = $(this).data('url')
  onFetchStart();
  try {
     const response = await fetch(URL);
     const data = await response.json();
     updatePreview(data.records, data.info)
   } catch (error) {
      console.log(error)
   } finally {
      if (!incompleteResults) {
         $('.bad-div').hide();
      } else $('.bad-div').show();
      onFetchEnd();
   }
});

$('#feature').on('click', 'a', async function (event) {
   const url = $(this).attr("href");
   if (url.startsWith('mailto')) { return; }
   event.preventDefault();
   onFetchStart();
   try {
      const response = await fetch(url);
      const data = await response.json();
      updatePreview(data.records, data.info);
   } catch (error) {
      console.error(error)
   }
   finally{
      onFetchEnd();
   }
});

$('#preview').on('click', '.object-preview', function (event) {
   event.preventDefault();
   let clickedRecord = $(this).data()
   $('#feature').html(renderFeature(clickedRecord.record))
  

});

function renderFeature(recordObjs) {
   const {title, dated, description, culture, style, technique, medium, dimensions, people, department, division, contact, creditline, images, primaryimageurl} = recordObjs
   return $(`
   <div class="object-feature">
      <header>
         <h3 style="margin-bottom: 2px;">${ title }</h3>
         <h4>${ dated }</h4>
      </header>
      <section class="facts">
         ${ factHTML('Description', description) }
         ${ factHTML('Culture', culture, 'culture')}
         ${ factHTML('Style', style)}
         ${ factHTML('Technique', technique)}
         ${ factHTML('Medium', medium ? medium.toLowerCase() : null, 'medium')}
         ${ factHTML('Dimensions', dimensions)}
         ${ people ? people.map((person) => {
               return factHTML('Person', person.displayname, 'person');
            }).join('') : ''}
         ${ factHTML('Department', department)}
         ${ factHTML('Division', division)}
         ${ factHTML('Contact', `<a target="_blank" href="mailto:${contact}"> ${contact}</a>`)}
         ${ factHTML('Creditline', creditline)}
      </section>
      <section class="photos dragscroll">
         ${ photosHTML(images, primaryimageurl)}
      </section>
   </div>
   `)
   
}

function searchURL(searchType, searchString) {
   return `${BASE_URL}/object?${KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
   if (!content) {
     return '';
   }
   if (searchTerm === null) {
      return `<span class="title">${title}</span>
      <span class="content">${content}</span>`
   }
   if (searchTerm) {
      return`<span class="title">${title}</span>
      <span class="content"><a href=${searchURL(searchTerm, content)}>${content}</a></span>`
   }
}

function photosHTML(images, primaryimageurl) {
   if (images && images.length > 0)  {
     return images.map(image => `<img src="${image.baseimageurl}" />`).join('')
   } else if (primaryimageurl) {
     return `<img src="${primaryimageurl}" />`
   } else return ''
}

function toggleHideDiv () {
   if (incompleteResults) {
      $('.bad-div').hide();
      $('.badDivs').text('Show Incomplete Results');
      incompleteResults = false;
   } else {
      $('.bad-div').show();
      $('.badDivs').text('Hide Incomplete Results');
      incompleteResults = true;
   }
}
$('.badDivs').on('click', toggleHideDiv);
