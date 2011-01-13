// Copyright (c) 2011, Anton Korenyushkin
// All rights reserved.

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the author nor the names of contributors may be
//       used to endorse or promote products derived from this software
//       without specific prior written permission.

// THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

require('ak').setup();


exports.init = function () {
  rv.Author.create(
    {
      name: 'unique string',
      password: 'string',
      cookie: 'string'
    });
  rv.Post.create(
    {
      slug: 'unique string',
      title: 'string',
      text: 'string',
      author: 'string -> Author.name',
      date: 'date'
    });
};


var IndexHandler = Handler.subclass(
  {
    get: function (request) {
      return render('index.html', {posts: rv.Post.all().get({by: '-date'})});
    }
  });


var LoginHandler = Handler.subclass(
  {
    get: function (request) {
      return render('login.html');
    },
    
    post: function (request) {
      var selection = rv.Author.where({name: request.post.name});
      var author = selection.getOne();
      if (author.password != request.post.password)
        throw Failure('Wrong Password');
      var cookie = Math.random() * 10e16 + '';
      selection.set({cookie: cookie});
      var response = redirect(reverse('new'));
      response.setCookie(
        'session', cookie,
        {expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)});
      return response;
    }
  });


var PostHandler = Handler.subclass(
  {
    get: function (request, slug) {
      return render('post.html', {post: rv.Post.where({slug: slug}).getOne()});
    }
  });
  
  
var FeedHandler = Handler.subclass(
  {
    get: function (request) {
      return render('feed.xml', {posts: rv.Post.all().get({by: '-date'})});
    }
  });


function getAuthor(request) {
  return rv.Author.where({cookie: request.cookies.session}).getOne();
}

var NewHandler = Handler.subclass(
  {
    get: function (request) {
      return render('new.html');
    },
    
    post: function (request) {
      var author = getAuthor(request);
      if (!request.post.slug || !request.post.title || !request.post.text)
        throw Failure('All fields must be specified');
      try {
        rv.Post.insert(
          {
            slug: request.post.slug,
            title: request.post.title,
            text: request.post.text,
            author: author.name,
            date: new Date()
          });
      } catch (error) {
        throw Failure('Post with this slug already exists');
      }
      return redirect(reverse('post', request.post.slug));
    }
  });


var EditHandler = Handler.subclass(
  {
    get: function (request, slug) {
      return render('edit.html', {post: rv.Post.where({slug: slug}).getOne()});
    },
    
    post: function (request, slug) {
      getAuthor(request);
      if (!request.post.title || !request.post.text)
        throw Failure('All fields must be specified');
      rv.Post.where({slug: slug}).set(
        {title: request.post.title, text: request.post.text});
      return redirect(reverse('post', slug));
    }
  });
  
  
var DeleteHandler = Handler.subclass(
  {
    get: function (request, slug) {
      return render('delete.html', {post: rv.Post.where({slug: slug}).getOne()});
    },
    
    post: function (request, slug) {
      getAuthor(request);
      rv.Post.where({slug: slug}).del();
      return redirect(reverse('index'));
    }
  });
    

exports.root = new URLMap(
  IndexHandler, 'index',
  ['login/', LoginHandler, 'login'],
  ['feed/', FeedHandler, 'feed'],
  ['new/', NewHandler, 'new'],
  ['', PostHandler, 'post',
    ['edit/', EditHandler, 'edit'],
    ['delete/', DeleteHandler, 'delete']]);
